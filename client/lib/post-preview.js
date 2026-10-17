const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const publicOrigin = () => {
  // Never trust the request's Host header for canonical links.
  const url = new URL(process.env.PUBLIC_SITE_ORIGIN || "https://greenway-candelaria.vercel.app");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid public post origin");
  return url.origin;
};
const safeImages = (images = []) => images.filter(value => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
});

function shareImage(image) {
  const url = new URL(image);
  const optimized = url.hostname === "res.cloudinary.com" && /^\/[^/]+\/image\/upload\/(?:v\d+\/)?greenway\/posts\//.test(url.pathname);
  if (optimized) {
    // Pad the full post image rather than cropping away its text or artwork.
    url.pathname = url.pathname.replace("/image/upload/", "/image/upload/c_pad,w_1200,h_630,b_white,f_jpg,q_85/");
  }
  return { url: optimized ? url.href : image, optimized };
}

const page = (title, content, metadata = "") => `<!doctype html>
<html lang="en" prefix="og: https://ogp.me/ns#"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · GreenWay</title>${metadata}
</head><body>${content}</body></html>`;

function renderPost(post, origin) {
  const title = String(post.title || "Community update").replace(/\s+/g, " ").trim();
  const description = String(post.body || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const images = safeImages(post.images).map(shareImage);
  const url = `${origin}/posts/${encodeURIComponent(post.id)}`;
  const metadata = `
<link rel="canonical" href="${escapeHtml(url)}">
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="GreenWay Candelaria">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
${images.map(image => `<meta property="og:image" content="${escapeHtml(image.url)}">
<meta property="og:image:secure_url" content="${escapeHtml(image.url)}">
${image.optimized ? '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ""}
<meta property="og:image:alt" content="${escapeHtml(title)}">`).join("\n")}
<meta name="twitter:card" content="${images.length ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${images[0] ? `<meta name="twitter:image" content="${escapeHtml(images[0].url)}">` : ""}`;
  return page(title, `<p><a href="/resident/contents?post=${encodeURIComponent(post.id)}">Open this post in GreenWay</a></p>`, metadata);
}

export function createPostPreviewHandler({ getPost, getOrigin = publicOrigin }) {
  return async (req, res) => {
    const headers = {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "Referrer-Policy": "no-referrer",
    };
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    try {
      // Always fetch anonymously, even if the browser sends an administrator token.
      const id = req.query?.id;
      if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(id)) throw { statusCode: 404 };
      // People enter the existing signed-in portal. Only preview crawlers get metadata HTML.
      const browserNavigation = req.headers?.["sec-fetch-mode"] === "navigate";
      const crawler = !browserNavigation && /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|viber|pinterestbot/i.test(req.headers?.["user-agent"] || "");
      if (!crawler) {
        res.statusCode = 302;
        res.setHeader("Location", `/resident/contents?post=${encodeURIComponent(id)}`);
        return res.end();
      }
      const post = await getPost(id);
      if (!post || post.status !== "PUBLISHED" || post.deleted_at) throw { statusCode: 404 };
      return res.end(renderPost(post, getOrigin()));
    } catch (error) {
      const missing = error?.statusCode === 404;
      res.setHeader("X-Robots-Tag", "noindex");
      res.statusCode = missing ? 404 : 503;
      return res.end(page(
        missing ? "Post unavailable" : "Please try again",
        `<article class="content"><h1>${missing ? "Post unavailable" : "Please try again"}</h1><p>${missing ? "This community update is no longer available." : "We could not load this community update right now."}</p></article>`,
      ));
    }
  };
}

