const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./posts.service");
const { getPublicPreview } = require("./posts.controller");

after(() => pool.end());

test("preview data is anonymous, excludes internal fields and never counts a view", async () => {
  const original = { getById: service.getById, incrementView: service.incrementView };
  try {
    service.getById = async (...args) => {
      assert.deepEqual(args, ["post-1"]);
      return { id: "post-1", title: "Clean streets", status: "PUBLISHED", body: "Join us", images: [], created_by: "private-id", author_avatar: "private-url" };
    };
    service.incrementView = () => assert.fail("preview must not count a view");
    let data;
    const response = { set() {}, status(code) { assert.equal(code, 200); return this; }, json(value) { data = value.data; } };
    await getPublicPreview({ params: { id: "post-1" }, user: { id: "admin", role: "ADMIN" } }, response, err => { throw err; });
    assert.equal(data.title, "Clean streets");
    assert.equal(data.created_by, undefined);
    assert.equal(data.author_avatar, undefined);
  } finally {
    Object.assign(service, original);
  }
});

test("unpublished and deleted preview data returns 404", async () => {
  const original = service.getById;
  try {
    for (const post of [{ status: "DRAFT" }, { status: "PUBLISHED", deleted_at: "2026-10-01" }]) {
      service.getById = async () => post;
      let error;
      await getPublicPreview({ params: { id: "post-1" } }, { set() {}, json() { assert.fail("must not disclose"); } }, err => { error = err; });
      assert.equal(error.statusCode, 404);
    }
  } finally {
    service.getById = original;
  }
});
