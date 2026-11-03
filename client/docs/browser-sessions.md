# Browser tabs and copied links

A new tab can join an active GreenWay session on the same origin and browser
profile. Remembered sessions hydrate from that browser's saved credentials.
Temporary sessions transfer credentials through the existing BroadcastChannel
from an open signed-in tab; the token is never persisted merely to support copying
a link. Without a responding temporary-session tab, sign-in is required.

Joining from an empty tab preserves its complete URL: pathname, query and hash.
ProtectedRoute validates the session with the API and applies role authorization.
A copied link contains no credentials and cannot sign in another browser, private
browser context or device. An independently signed-in browser uses its own session.

Explicitly signing out one tab remains sticky on reload and subsequent navigation
in that tab. Other active tabs retain their existing session. Replacing an account
in an already signed-in tab still performs a full navigation to the new role's
home and resets account-scoped query caches. Session-replacement notices retain
their existing sign-in-again flow. API and mobile contracts are unchanged.

Local verification uses fictional API/browser fixtures; no real accounts or
database records are involved. Live Vercel behavior requires deploying the updated
web client. Native mobile session behavior is outside this web-only change.
