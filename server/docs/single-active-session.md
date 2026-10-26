# One active sign-in per account

Each successful sign-in replaces prior sessions for the same account across
the website, resident app and collector app. The existing locked user row
serializes concurrent logins and password/account changes. Session deletion
and creation commit together; invalid credentials, unavailable accounts and
rolled-back logins leave the previous session unchanged.

There is no database migration. Only the existing sessions table is used.
Deleting sessions also revokes their session-bound mobile push registrations
through the existing foreign key. No route runs, stop outcomes or GPS history
are updated by a login or remote sign-out.

After commit the server sends `session:replaced` only to sockets matching a
revoked hashed (or legacy raw) token, then disconnects them. The payload contains
only the reason code, with no credentials, account profile or device data.
Ordinary subscriptions and deliveries retain their session authorization checks.

`GET /api/auth/session` is authenticated and has `Cache-Control: no-store`.
It returns `{success:true,data:{active:true}}` for the current session. A valid
JWT whose session is absent receives a 401 `SESSION_REPLACED` only if an active
session exists created at or after that JWT's issuance. This explains that the
account is now signed in elsewhere without keeping a separate revoked-token
table. Expired/invalid JWTs and revocations with no newer login retain generic
session errors. The server never authorizes an old token based on this check.

The website listens for replacement hints and checks every 30 seconds while
visible, on connection, online, focus and visibility return. Its notice persists
across the sign-in redirect until acknowledged. Signed-in tabs for the same website
origin in one browser profile share one account. If a tab signs in as B while
another displays A, the A tab adopts B and navigates to B's role home. This
clears the old view/cache while retaining account-scoped saved form drafts.
Anonymous tabs and newly opened tabs wait for their own explicit sign-in. They do
not join another tab's login, even when that login uses Remember Me. An existing
authenticated tab retains its private membership on reload so it can reconcile
account changes it missed while suspended. Duplicating an authenticated tab may
copy its sessionStorage, following the browser's tab-duplication behavior.

Remembered credentials continue to use localStorage. Unchecked Remember Me
keeps credentials in each open tab's sessionStorage and transfers them directly
through BroadcastChannel. Persistent browser metadata contains only an opaque
generation, active state and persistence choice, not temporary credentials.
Only a snapshot matching the current generation can be adopted. If no current
temporary tab remains, a new tab cannot restore that login from persistent data.
Legacy saved logins migrate when the new client loads. Separate profiles,
incognito contexts and other browsers have independent storage.

The web Sign Out action ends only the current tab's local access. It does not
call the server logout endpoint or delete the shared remembered credential,
because other signed-in tabs still use that same server session. A tab-private
signed-out flag survives reload and rejects automatic peer restoration. Only
a successful explicit sign-in clears that flag. Signed-in tabs still adopt the
latest browser account; anonymous and signed-out tabs stay anonymous until sign-in.
The same rule applies after session invalidation. The confirmation dialog states
the scope of manual sign-out. Remember Me retains credentials for an already
authenticated tab; it does not enroll a new tab. Full session invalidation,
including signing in on another device, still ends all active copies.

Browser-local sign-ins publish a credential-free handoff marker for at most
20 seconds, covering the existing 15-second login timeout. This prevents a
previous session's replacement notice from interrupting peers while the new
browser credentials arrive. It does not authorize the revoked token: server
checks remain effective immediately. Failed logins do not change credentials;
if the handoff fails after server replacement, reconciliation signs out the old
session after the handoff ends/expires.

Remote replacement propagates across active tabs. Before synchronization,
the old screen cannot read/write the new credentials or dispatch API calls as
the new account. Adoption increments the store generation and a full navigation
discards old cache, pending responses and selected records. A sign-in already
in progress is allowed to finish before an older session notice is processed.

The mobile roots check on connection, foreground, reconnect and every 30 seconds
while active. A socket hint requests an authenticated check, including when
backgrounded if execution is available. Their API handlers clear only the
captured current session, show the shared signed-out alert, and preserve a
newer local login. Session cleanup completes before new login credentials are
persisted. Collector authentication teardown stops that device's GPS through
the existing GPS/session lifecycle; it does not finish or pause the route.

Network errors and 5xx responses from the new monitor leave authentication
intact. Suspended or disconnected clients may show the warning only when they
resume/reconnect. Server-side revocation is effective from the login commit.

## Validation and rollout

Run fixture-only regressions from server/: 

`node --test test/auth.single-session.test.js test/mobile.session-replacement.test.js test/web.session-replacement.test.js test/web.browser-account.test.js`

These tests use mocks rather than the configured database. Run the website and
both mobile TypeScript checks and the website's scoped lint/build. The browser
fixture also checks the persistent notice, stale event protection, reconciliation
and shared browser tabs. Real multi-device delivery, native suspension and GPS
shutdown still require a device smoke check.

Deploy the updated API and website; rebuild both mobile apps to include their
specific notice and monitoring. Older clients still lose server access but may
show their generic expired-session message. APK files already distributed are
not changed by source edits. No database records were modified during development.
