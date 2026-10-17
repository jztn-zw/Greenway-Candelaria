# Public post sharing

Resident Share sends `<EXPO_PUBLIC_SITE_URL>/posts/<encoded post ID>`, defaulting
to `https://greenway-candelaria.vercel.app/posts/<encoded post ID>`.
The API server returns a standalone article page with Open Graph and Twitter
image/title metadata in the initial HTML. Readers do not need to sign in.
The first post image is the preferred preview image; the article includes all
post images and the full body. The receiving app controls the final card layout.

Only published, non-deleted posts are available. The route always fetches as an
anonymous reader, ignores browser credentials, and does not increment views.
Draft, scheduled, archived and missing posts return 404 without preview content.
Database failures return a generic 503 page. Tests use fixtures, not live records.

## Deployment

Deploy both server changes and `client/vercel.json` before using the updated
resident Share button. The `/posts/:id` Vercel rewrite must precede the SPA
fallback and proxy to the Render article route. This preserves the public
website URL while returning crawler-readable article HTML.
Canonical links default to the GreenWay Vercel site. For a custom domain, set
`PUBLIC_POST_ORIGIN` on the server and `EXPO_PUBLIC_SITE_URL` in the resident app
to the same website origin. API calls continue using `EXPO_PUBLIC_SERVER_HOST`.

The server and preview images must be publicly reachable over HTTPS for remote
preview generation. No new Android native module or rebuild is required for link
sharing. The resident app's earlier file-system dependency fix still requires
its own rebuild if that has not already been installed.

After deployment, check a real published URL in a browser and in the target
messaging app. Preview services can cache older cards; server-side `no-store`
does not force another service to discard its stored preview. Already-delivered
previews cannot be recalled when a post is archived.

## Checks

From `server/`: `node --test src/modules/posts/posts.preview.test.js`.
From `residentapp/`: `node --test src/services/postShare.test.mjs` and
`node node_modules/typescript/bin/tsc --noEmit --pretty false`.
