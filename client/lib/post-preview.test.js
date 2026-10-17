import { test } from "node:test";
import assert from "node:assert/strict";
import { createPostPreviewHandler } from "./post-preview.js";
import vercelHandler from "../api/post-preview.js";

const published = { id: "post-1", status: "PUBLISHED", title: "A greener community", body: "Separate waste.", images: ["https://example.com/post.jpg"] };
async function request(getPost, id = "post-1", userAgent = "facebookexternalhit/1.1") {
  const response = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(html) { this.html = html; } };
  await createPostPreviewHandler({ getPost, getOrigin: () => "https://greenway-candelaria.vercel.app" })({ query: { id }, headers: { host: "untrusted.example", "user-agent": userAgent } }, response);
  return response;
}

test("preview crawlers receive image and title metadata without a separate article view", async () => {
  const response = await request(async (...args) => { assert.deepEqual(args, ["post-1"]); return published; });
  assert.equal(response.statusCode, 200);
  assert.match(response.html, /property="og:title" content="A greener community"/);
  assert.match(response.html, /property="og:image" content="https:\/\/example.com\/post.jpg"/);
  assert.match(response.html, /property="og:url" content="https:\/\/greenway-candelaria.vercel.app\/posts\/post-1"/);
  assert.doesNotMatch(response.html, /<article|<img|greenway-resident:/);
  assert.doesNotMatch(response.html, /onrender.com|untrusted.example/);
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("browser clicks go straight to the existing GreenWay post route without an API lookup", async () => {
  const response = await request(() => assert.fail("browser redirect must not depend on the API"), "post-1", "Mozilla/5.0 Chrome/130.0");
  assert.equal(response.statusCode, 302);
  assert.equal(response.headers.Location, "/resident/contents?post=post-1");
  assert.equal(response.html, undefined);
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("unpublished, deleted and missing posts never expose preview content", async () => {
  for (const post of [null, { ...published, deleted_at: "2026-10-01" }, ...["DRAFT", "ARCHIVED", "SCHEDULED"].map(status => ({ ...published, status }))]) {
    const response = await request(async () => post);
    assert.equal(response.statusCode, 404);
    assert.doesNotMatch(response.html, /A greener community|og:image/);
  }
});

test("invalid identifiers never reach the backend", async () => {
  for (const id of [null, ["post-1"], "../private", ""]) {
    const response = await request(() => assert.fail("must not fetch"), id);
    assert.equal(response.statusCode, 404);
  }
});

test("unsafe text and image URLs cannot inject markup", async () => {
  const response = await request(async () => ({ ...published, title: '<script>alert(1)</script>', body: '<img src=x onerror="alert(1)">', images: ["javascript:alert(1)"] }));
  assert.doesNotMatch(response.html, /<script>|<img src=x|javascript:/);
  assert.match(response.html, /&lt;script&gt;/);
});

test("backend failures return a generic unavailable page", async () => {
  const response = await request(async () => { throw new Error("Private database details"); });
  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.html, /Private database|og:image/);
});

test("Vercel reads the public JSON API and returns HTML without redirecting to Render", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /\/api\/posts\/preview\/post-1$/);
      assert.deepEqual(options.headers, { Accept: "application/json" });
      return { ok: true, json: async () => ({ success: true, data: published }) };
    };
    const response = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(html) { this.html = html; } };
    await vercelHandler({ query: { id: "post-1" }, headers: { authorization: "ignored", "user-agent": "Twitterbot/1.0" } }, response);
    assert.match(response.html, /A greener community/);
    assert.equal(response.headers.Location, undefined);
    assert.match(response.headers["Content-Type"], /text\/html/);
  } finally {
    globalThis.fetch = original;
  }
});
