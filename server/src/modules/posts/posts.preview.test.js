const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createPostPreviewHandler } = require("./posts.preview");

async function request(getPost, run, getOrigin = () => "https://greenway.example") {
  const app = express();
  app.get("/posts/:id", createPostPreviewHandler({ getPost, getOrigin: getOrigin || undefined }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const published = { id: "post-1", status: "PUBLISHED", title: "A greener community", body: "Separate waste.\n\nKeep our streets clean.", category: "WASTE_TIP", author_name: "MENRO", images: ["https://res.cloudinary.com/demo/image/upload/post.jpg"] };

test("canonical URLs use the public website instead of the API domain", async () => {
  const original = process.env.PUBLIC_POST_ORIGIN;
  delete process.env.PUBLIC_POST_ORIGIN;
  try {
    await request(async () => published, async origin => {
      const html = await (await fetch(`${origin}/posts/post-1`)).text();
      assert.match(html, /property="og:url" content="https:\/\/greenway-candelaria.vercel.app\/posts\/post-1"/);
    }, null);
  } finally {
    if (original === undefined) delete process.env.PUBLIC_POST_ORIGIN;
    else process.env.PUBLIC_POST_ORIGIN = original;
  }
});

test("public share URLs return article HTML and crawler-readable preview metadata", async () => {
  await request(async (...args) => { assert.deepEqual(args, ["post-1"]); return published; }, async origin => {
    const response = await fetch(`${origin}/posts/post-1`, { headers: { Host: "untrusted.example" } });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(html, /property="og:title" content="A greener community"/);
    assert.match(html, /property="og:image" content="https:\/\/res.cloudinary.com\/demo\/image\/upload\/post.jpg"/);
    assert.match(html, /property="og:url" content="https:\/\/greenway.example\/posts\/post-1"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /<p>Separate waste\.<\/p>/);
    assert.match(html, /greenway-resident:\/\/post-details\?id=post-1/);
    assert.doesNotMatch(html, /untrusted.example|<script/);
  });
});

for (const status of ["DRAFT", "SCHEDULED", "ARCHIVED"]) test(`${status} posts never expose previews, even to a logged-in visitor`, async () => {
  await request(async () => ({ ...published, status, title: "Private title" }), async origin => {
    const response = await fetch(`${origin}/posts/post-1`);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /Private title|og:image/);
  });
});

test("deleted and missing posts return a safe not-found page", async () => {
  for (const getPost of [async () => ({ ...published, deleted_at: "2026-10-01" }), async () => { throw { statusCode: 404 }; }]) {
    await request(getPost, async origin => {
      const response = await fetch(`${origin}/posts/post-1`);
      assert.equal(response.status, 404);
      assert.doesNotMatch(await response.text(), /A greener community|og:image/);
    });
  }
});

test("post text is escaped and unsafe image URLs are excluded", async () => {
  await request(async () => ({ ...published, title: '"><script>alert(1)</script>', body: '<img src=x onerror="alert(1)">', images: ["javascript:alert(1)", 'https://example.com/a"b.jpg'] }), async origin => {
    const html = await (await fetch(`${origin}/posts/post-1`)).text();
    assert.doesNotMatch(html, /<script>|<img src=x|javascript:/);
    assert.match(html, /&lt;script&gt;/);
  });
});

test("temporary failures return 503 without leaking internal errors", async () => {
  await request(async () => { throw new Error("Database password fixture"); }, async origin => {
    const response = await fetch(`${origin}/posts/post-1`);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /password|og:image/);
  });
});
