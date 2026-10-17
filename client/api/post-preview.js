import { createPostPreviewHandler } from "../lib/post-preview.js";

export default createPostPreviewHandler({
  async getPost(id) {
    const origin = process.env.GREENWAY_API_ORIGIN || "https://greenway-candelaria.onrender.com";
    const response = await fetch(`${origin.replace(/\/+$/, "")}/api/posts/preview/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
      redirect: "error",
    });
    if (!response.ok) throw { statusCode: response.status === 404 ? 404 : 503 };
    const result = await response.json();
    if (!result.success) throw { statusCode: 503 };
    return result.data;
  },
});
