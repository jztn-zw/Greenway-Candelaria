# Public post sharing

Resident Share sends `<EXPO_PUBLIC_SITE_URL>/posts/<encoded post ID>`, defaulting
to `https://greenway-candelaria.vercel.app/posts/<encoded post ID>`.
Browser visitors are redirected to the existing GreenWay portal at
`/resident/contents?post=<ID>`. Signed-out visitors see the existing login modal;
after a resident signs in, the portal opens that post. Admin and collector
accounts retain their own role destinations. The same `/posts/<ID>` URL is used
by the resident web Share action and the Android app.

Recognized messaging preview crawlers receive Open Graph and Twitter image/title
metadata in the initial HTML. There is no separate article interface. Preview
metadata remains public for published posts, while readers enter the portal's
login flow. The first image is the preferred preview image. The receiving app
controls the final card layout. Public Cloudinary post images use a 1200 × 630
JPEG preview padded with white to preserve the entire artwork, with explicit
image dimensions, type and secure URL metadata. Other HTTPS image hosts retain
their original image URLs. Deploy the client function for this to take effect;
refresh an existing Facebook/Messenger card with Meta's Sharing Debugger and
share again. Older messages may retain the previously cached card.

Only published, non-deleted posts expose preview metadata. The preview fetches as an
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
preview generation. The website redirect change requires a client deployment.
If the Android build was installed before the HTTPS intent filter was added,
rebuild/install it once with `npx expo run:android --device` from `residentapp/`
to enable opening verified website links in the app.

After deployment, check a real published URL in a browser and in the target
messaging app. Preview services can cache older cards; server-side `no-store`
does not force another service to discard its stored preview. Already-delivered
previews cannot be recalled when a post is archived.

## Android website-to-app links

The Android manifest and Expo config claim only HTTPS `/posts/` links on
`greenway-candelaria.vercel.app`. The `app/posts/[id].tsx` route forwards them
to Post Details. Other website pages stay in the browser. If Android does not
open the app, the same HTTPS link enters the existing website login/post flow.

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

For the current Android user, also check `adb shell pm get-app-links --user cur
com.greenway.candelaria.resident`. A verified domain can still be disabled in
that user's selection. Enable GreenWay's supported link in Android Settings →
Apps → GreenWay Resident → Open by default when that happens. Rebuilding is not
needed when the installed app already has the verified HTTPS intent filter.

## Automated checks

From `client/`: `node --test lib/post-preview.test.js`.
From `server/`: `node --test src/modules/posts/posts.preview-api.test.js`.
From `residentapp/`: `node --test src/services/postShare.test.mjs src/services/postAppLinks.test.mjs` and
`node node_modules/typescript/bin/tsc --noEmit --pretty false`.
