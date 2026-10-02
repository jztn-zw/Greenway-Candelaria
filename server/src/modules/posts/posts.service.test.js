const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const audit = require("../audit/audit.service");
const posts = require("./posts.service");
const { createPostSchema, updatePostSchema } = require("./posts.schema");

after(() => pool.end());

// Model the posts table after the source column has been removed. Reject SQL
// that refers to it or supplies a different number of values than placeholders.
const withDatabase = async (run) => {
  const original = { query: pool.query, getConnection: pool.getConnection, log: audit.log };
  const rows = new Map([["original", {
    id: "original", title: "Waste guide", body: "Separate recyclable waste.",
    category: "WASTE_TIP", status: "DRAFT", is_featured: true,
    created_by: "original-author", author_name: "Original author", view_count: 0,
  }]]);
  const images = new Map([["original", ["https://example.com/recycling.jpg"]]]);
  const tags = new Map([["original", ["recycling"]]]);
  const queries = [];
  const verify = (sql, params = []) => {
    assert.doesNotMatch(sql, /\bsource\b/i);
    assert.equal((sql.match(/\?/g) || []).length, params.length, "SQL parameter count");
    queries.push({ sql, params });
  };
  pool.query = async (sql, params = []) => {
    verify(sql, params);
    if (sql.includes("scheduled_at <= NOW()")) return [[]];
    if (sql.includes("AS total_posts")) return [[{ total_posts: rows.size, drafts: rows.size }]];
    if (sql.includes("COUNT(*) AS total")) return [[{ total: rows.size }]];
    if (sql.includes("WHERE p.id = ?")) {
      const row = rows.get(params[0]);
      return [row ? [{ ...row }] : []];
    }
    if (sql.includes("FROM posts p")) return [[...rows.values()].map((row) => ({ ...row }))];
    if (sql.includes("FROM post_images")) {
      return [params.flatMap((id) => (images.get(id) || []).map((url) => ({ post_id: id, url })))];
    }
    if (sql.includes("FROM post_tags")) {
      return [params.flatMap((id) => (tags.get(id) || []).map((tag) => ({ post_id: id, tag })))];
    }
    if (sql.includes("FROM post_likes")) return [[]];
    throw new Error(`Unexpected read: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, params = []) => {
      verify(sql, params);
      if (sql.includes("INSERT INTO posts")) {
        const columns = sql.match(/INSERT INTO posts\s*\(([^)]+)\)/)[1].split(",").map((column) => column.trim());
        assert.equal(columns.length, params.length);
        const row = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
        rows.set(row.id, row);
      } else if (sql.startsWith("UPDATE posts SET")) {
        const row = rows.get(params.at(-1));
        [...sql.matchAll(/(\w+) = \?/g)].forEach((match, index) => { row[match[1]] = params[index]; });
      } else if (sql.includes("INSERT INTO post_images")) {
        params[0].forEach(([, postId, url]) => { images.set(postId, [...(images.get(postId) || []), url]); });
      } else if (sql.includes("INSERT INTO post_tags")) {
        params[0].forEach(([, postId, tag]) => { tags.set(postId, [...(tags.get(postId) || []), tag]); });
      } else {
        throw new Error(`Unexpected write: ${sql}`);
      }
      return [{ affectedRows: 1 }];
    },
  });
  audit.log = async () => {};
  try { await run({ queries }); }
  finally { pool.query = original.query; pool.getConnection = original.getConnection; audit.log = original.log; }
};

test("post validation accepts source-free data and discards legacy attribution payloads", () => {
  const valid = { title: "Waste guide", body: "Recycle correctly.", category: "WASTE_TIP" };
  assert.equal(createPostSchema.safeParse(valid).success, true);
  assert.equal(Object.hasOwn(createPostSchema.parse({ ...valid, source: "Old credit" }), "source"), false);
  assert.deepEqual(updatePostSchema.parse({ title: "Updated", source: "Old credit" }), { title: "Updated" });
});

test("post search and pagination bind the remaining search fields correctly", async () => {
  await withDatabase(async ({ queries }) => {
    const page = await posts.getAll({ search: "recycle", page: 1, limit: 5, all: true }, "admin", "ADMIN");
    assert.equal(page.total, 1);
    assert.equal(page.posts[0].author_name, "Original author");
    const list = queries.find(({ sql }) => sql.includes("LIMIT ? OFFSET ?"));
    assert.deepEqual(list.params, ["admin", "%recycle%", "%recycle%", "%recycle%", "%recycle%", 5, 0]);
    const count = queries.find(({ sql }) => sql.includes("COUNT(*) AS total"));
    assert.deepEqual(count.params, ["%recycle%", "%recycle%", "%recycle%", "%recycle%"]);
  });
});

test("creating and editing posts preserves the trusted author without an attribution column", async () => {
  await withDatabase(async () => {
    const created = await posts.create("publishing-admin", createPostSchema.parse({ title: "New guide", body: "Recycle.", category: "WASTE_TIP" }));
    assert.equal(created.created_by, "publishing-admin");
    assert.equal(created.title, "New guide");
    assert.equal(Object.hasOwn(created, "source"), false);
    const updated = await posts.update(created.id, updatePostSchema.parse({ title: "Updated guide", source: "Old credit" }), "editing-admin");
    assert.equal(updated.title, "Updated guide");
    assert.equal(updated.created_by, "publishing-admin");
  });
});

test("duplicating a post retains its content, images and tags with the new author's record", async () => {
  await withDatabase(async () => {
    const copy = await posts.duplicate("original", "copying-admin");
    assert.equal(copy.title, "Waste guide (Copy)");
    assert.equal(copy.body, "Separate recyclable waste.");
    assert.equal(copy.status, "DRAFT");
    assert.equal(copy.is_featured, false);
    assert.equal(copy.created_by, "copying-admin");
    assert.deepEqual(copy.images, ["https://example.com/recycling.jpg"]);
    assert.deepEqual(copy.tags, ["recycling"]);
    assert.equal(Object.hasOwn(copy, "source"), false);
  });
});
