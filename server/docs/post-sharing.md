# Public post sharing

Resident Share sends `<EXPO_PUBLIC_SITE_URL>/posts/<encoded post ID>`, defaulting
to `https://greenway-candelaria.vercel.app/posts/<encoded post ID>`.
Vercel returns an article page with Open Graph and Twitter
image/title metadata in the initial HTML. Readers do not need to sign in.
The first post image is the preferred preview image; the article includes all
post images and the full body. The receiving app controls the final card layout.

Only published, non-deleted posts are available. The route always fetches as an
anonymous reader, ignores browser credentials, and does not increment views.
Draft, scheduled, archived and missing posts return 404 without preview content.
Database failures return a generic 503 page. Tests use fixtures, not live records.

## Deployment

Deploy the server first, then the client including `api/`, `lib/` and
`vercel.json`. The Vercel project root must be `client/` so its Node function is
deployed alongside the Vite website. The `/posts/:id` rewrite runs the local
`api/post-preview.js` function before the SPA fallback. It reads public post
data from `/api/posts/preview/:id` without forwarding browser credentials or
incrementing views. The Render server no longer serves `/posts/:id` HTML.

Shared URLs and browser addresses stay on the Vercel website. The API remains
on Render for data. `GREENWAY_API_ORIGIN` optionally overrides the function's
API origin. For a custom website domain, set `PUBLIC_SITE_ORIGIN` on Vercel and
`EXPO_PUBLIC_SITE_URL` in the resident app to the same website origin. API calls
from the resident app continue using `EXPO_PUBLIC_SERVER_HOST`.

The server and preview images must be publicly reachable over HTTPS for remote
preview generation. No new Android native module or rebuild is required for link
sharing. The resident app's earlier file-system dependency fix still requires
its own rebuild if that has not already been installed.

After deployment, check a real published URL in a browser and in the target
messaging app. Preview services can cache older cards; server-side `no-store`
does not force another service to discard its stored preview. Already-delivered
previews cannot be recalled when a post is archived.

## Android website-to-app links

The Android manifest and Expo config claim only HTTPS `/posts/` links on
`greenway-candelaria.vercel.app`. The `app/posts/[id].tsx` route forwards them
to Post Details. Other website pages stay in the browser. If Android does not
open the app, the same HTTPS link still serves the website article.

Vercel serves `client/public/assetlinks.json` at
`/.well-known/assetlinks.json` as JSON before the SPA fallback. Its fingerprint
was read from the current resident `android/app/debug.keystore`; this is for
the current development build. Before a production release, replace the debug
fingerprint with the production signing certificate, or the Google Play App
Signing certificate if using Play. Do not assume the debug key identifies a
production build. The current Gradle release configuration also uses that debug
key; it has not been changed here.

Deploy the website association first, rebuild/install Android, then test the
shared link in a messaging app. Android must verify the website association;
some apps' embedded browsers may still keep the link in their browser. iOS
Universal Links require a separate Apple team association and are not configured.

Read-only device verification:

```powershell
adb shell pm get-app-links com.greenway.candelaria.resident
```

## Automated checks

From `client/`: `node --test lib/post-preview.test.js`.
From `server/`: `node --test src/modules/posts/posts.preview-api.test.js`.
From `residentapp/`: `node --test src/services/postShare.test.mjs src/services/postAppLinks.test.mjs` and
`node node_modules/typescript/bin/tsc --noEmit --pretty false`.
