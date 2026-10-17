const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const publicOrigin = () => {
  // Never trust the request's Host header for canonical links.
  const url = new URL(process.env.PUBLIC_POST_ORIGIN || "https://greenway-candelaria.vercel.app");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid public post origin");
  return url.origin;
};
const safeImages = (images = []) => images.filter(value => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
});

const page = (title, content, metadata = "") => `<!doctype html>
<html lang="en" prefix="og: https://ogp.me/ns#"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · GreenWay</title>${metadata}
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f7f5;color:#19372a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65}
header,main,footer{max-width:760px;margin:auto;padding:24px}header{font-size:20px;font-weight:750;color:#087d45}header span{display:block;font-size:12px;font-weight:500;color:#64796f}
article{background:#fff;border:1px solid #dde9e1;border-radius:24px;overflow:hidden}.photo{display:block;width:100%;max-height:560px;object-fit:contain;background:#edf4ef}.content{padding:28px}
h1{font-size:clamp(24px,5vw,36px);line-height:1.2;letter-spacing:-.6px;margin:14px 0}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 18px}.meta{font-size:13px;color:#64796f}.category{display:inline-block;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:650;color:#087d45;background:#e4f5ec}
.button{display:inline-block;margin-top:10px;padding:12px 20px;border-radius:14px;color:white;background:#087d45;text-decoration:none;font-weight:650}.button:focus-visible{outline:3px solid #65b68b;outline-offset:4px}.gallery{display:grid;gap:12px;margin-top:24px}.gallery img{border-radius:14px}footer{font-size:12px;color:#64796f;text-align:center}
@media(max-width:480px){header,main,footer{padding:16px}.content{padding:20px}}
</style></head><body><header>GreenWay<span>Community updates · Candelaria</span></header><main>${content}</main><footer>Working together for a cleaner Candelaria.</footer></body></html>`;

function renderPost(post, origin) {
  const title = String(post.title || "Community update").replace(/\s+/g, " ").trim();
  const description = String(post.body || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const images = safeImages(post.images);
  const url = `${origin}/posts/${encodeURIComponent(post.id)}`;
  const metadata = `
<link rel="canonical" href="${escapeHtml(url)}">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="GreenWay Candelaria">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
${images.map(image => `<meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:alt" content="${escapeHtml(title)}">`).join("\n")}
<meta name="twitter:card" content="${images.length ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${images[0] ? `<meta name="twitter:image" content="${escapeHtml(images[0])}">` : ""}`;
  const category = { WASTE_TIP: "Waste Tip", EVENT: "Event", ANNOUNCEMENT: "Announcement" }[post.category] || "Community update";
  const photo = (image, index) => `<img class="photo" src="${escapeHtml(image)}" alt="${escapeHtml(title)}${index ? ` — photo ${index + 1}` : ""}"${index ? ' loading="lazy"' : ""}>`;
  const content = `<article>${images[0] ? photo(images[0], 0) : ""}<div class="content">
<span class="category">${escapeHtml(category)}</span><h1>${escapeHtml(title)}</h1>
${post.author_name ? `<p class="meta">${escapeHtml(post.author_name)}</p>` : ""}
${String(post.body || "").split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
${images.length > 1 ? `<div class="gallery">${images.slice(1).map((image, i) => photo(image, i + 1)).join("")}</div>` : ""}
<a class="button" href="greenway-resident://post-details?id=${encodeURIComponent(post.id)}">Open in GreenWay</a>
</div></article>`;
  return page(title, content, metadata);
}

function createPostPreviewHandler({ getPost, getOrigin = publicOrigin }) {
  return async (req, res) => {
    res.set({
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "Referrer-Policy": "no-referrer",
    });
    try {
      // Always fetch anonymously, even if the browser sends an administrator token.
      const post = await getPost(req.params.id);
      if (!post || post.status !== "PUBLISHED" || post.deleted_at) throw { statusCode: 404 };
      return res.type("html").send(renderPost(post, getOrigin()));
    } catch (error) {
      const missing = error?.statusCode === 404;
      res.set("X-Robots-Tag", "noindex");
      return res.status(missing ? 404 : 503).type("html").send(page(
        missing ? "Post unavailable" : "Please try again",
        `<article class="content"><h1>${missing ? "Post unavailable" : "Please try again"}</h1><p>${missing ? "This community update is no longer available." : "We could not load this community update right now."}</p></article>`,
      ));
    }
  };
}
module.exports = { createPostPreviewHandler };
