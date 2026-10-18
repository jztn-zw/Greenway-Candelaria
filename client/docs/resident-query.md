# Resident web server state

Resident dashboard, report submission/lookups, My Reports and report details,
community posts/details/reactions, schedules, notifications, profile, settings,
and tracking HTTP reads now use TanStack Query. Resident setup also uses account-
scoped queries for barangay/street choices and a managed profile mutation.
Mobile apps are outside this change.

## Refresh behavior

- Successful report creation, status/response changes, flag resolution, linked
  duplicate resolution, and deletion publish a private hint to the report owner.
  My Reports, an open report detail, and dashboard/profile counts then refresh if
  mounted. This does not depend on the owner's notification preference.
- Post, announcement, route, schedule and barangay changes publish domain hints.
  Residents fetch only content allowed by the existing authenticated endpoints.
  Draft posts and announcements remain subject to their existing visibility rules.
- Notification sockets refresh the shared notification history used by the sidebar,
  top bar and notification page. Read/clear actions also invalidate that history.
  Records load only for the visible menu window or selected category page; the
  server supplies full unread/history/recent counts. The content badge also uses
  the full unread post count. Opening a successfully loaded post marks only that
  resident's notifications for that post read, without downloading older history.
  Browsing Contents or receiving a newly published post leaves its alerts unread.
- Notification ages use the database UTC clock included with each history read,
  advanced with the browser's monotonic timer. Labels refresh every 30 seconds;
  absolute dates use Asia/Manila. Before time sync, an absolute Philippine timestamp
  appears instead of a relative age based on the device's wall clock.
- Changes are batched for 300 ms. Only active queries fetch immediately; inactive
  queries are marked stale. Query keys retain search, filters and pagination.
- Visible resident pages also reconcile after 60 seconds, on focus/reconnect, and
  when returning to a hidden tab. The timer sends checks even if nothing changed;
  this is not a full browser reload. Matching pending writes defer event refreshes.
- Truck GPS keeps its authenticated live socket. Tracking HTTP queries poll every
  30 seconds; the dashboard's live-truck summary polls every 15 seconds. New socket
  samples cancel older reads so late HTTP responses cannot replace newer GPS data.
  Road routing, coverage paths and route completion rules are unchanged.
- Report forms, selected calendar dates, profile/password/address drafts and UI
  selections remain local state. Background queries do not reset them. Settings
  saves run in order and hydrate server values after pending writes finish.
- Open calendar notices store a selected ID and display the current queried
  event. Updated notices refresh in place; deleted or no-longer-visible notices
  close. Edit drafts remain local state.
- Pending setup accounts retain their existing socket restrictions. Their area
  queries reconcile every 60 seconds and on normal query focus/reconnect without
  clearing typed fields or changing the selected street. Removed choices must be
  selected again before saving if street choices remain. If all streets are
  removed, setup can continue with the barangay and no street.

## Boundaries

Resident Profile offers password-confirmed account deletion. It waits for pending
resident mutations, cancels account reads, and clears local authentication only
after the server commits the deleted account, session revocation, and audit history together.
No second logout request runs against the revoked session. Failure keeps the dialog
and password open; rate limiting displays a live inline countdown. A late response
cannot clear a newer login. The server removes profile/contact details, credentials,
notification inbox and preferences while keeping the user ID for municipal history.
Reports remain attributed to “Deleted Resident”; login and recovery cannot restore
the deleted account. No schema migration is required. Previously self-deactivated
accounts retain their legacy login compatibility, but the self-deactivation endpoint
is retired. Banned accounts remain blocked. See the server database README for retention.
Settings reads/creation, settings writes, and profile-to-settings area sync recheck
the active account under the same server row lock as deletion. An older request
from another device cannot repopulate a deleted profile or recreate its settings.

Query keys include role and resident ID. Area-dependent reads also include barangay
and street. The profile and its owner-only report totals use account scope, so a
saved address change updates the profile in place without restarting its initial
loading skeleton. Collection and tracking reads still switch to the new area.
Account/role/token changes
already replace the application's QueryClient. Queued writes also verify their
original login before executing. Writes and failed reads are not automatically retried.

Resident data events contain domain names only. Private report/profile/settings/
notification hints require a server-supplied owner ID. Subscription and each delivery
reauthorize the session. Clients cannot select another resident's private room.

Report drafts use an account-specific local-storage key. Unattributed legacy drafts
are not imported into another account. Drafts still persist in browser storage; this
does not encrypt them or protect them from another person with access to the browser.

Initial failures show the existing error UI; background failures retain the last
successful data where possible. Deleted/inaccessible report and post details are
not kept visible after a 403/404. Ordinary refreshes do not change delivery
preferences. After the announcement initialization-marker migration, a completed
resident's first inbox or unread-count read performs one atomic catch-up for
eligible active notices broadcast before signup. The durable marker prevents
subsequent reads from restoring cleared alerts. Existing records/read receipts,
barangay targeting and account authorization are respected. Phone alert switches
do not suppress the durable inbox. This
server behavior is shared with the Resident app.

Resident notification preferences are saved to the account so the API can suppress
phone push delivery while the app is closed. Turning off a category or all phone
alerts keeps authorized collection, report, post and announcement inbox records,
unread counts and socket updates. Broadcast selection, schedule reminders and
announcement recipient reconciliation never filter by those phone preferences.
The push sender checks preferences separately, together with current account,
session and device authorization. Admin and collector preference rules are unchanged.

Resident web Settings manages browser notifications separately. Those opt-in
preferences are stored per resident account in the current browser; web toggles
never write the server's phone-push flags. Browser permission is requested only
from the explicit enable switch. Native browser alerts supplement authorized
`notification:new` events while GreenWay is open, including background tabs.
The display-only service worker supports notification clicks; it does not cache
application responses, subscribe to background Web Push, or receive new alerts
after the site is closed. HTTPS (or localhost) and browser notification support
are required. Clearing site storage resets browser preferences. Phone push stays
account-backed and is managed in the Resident mobile app. Both channels always
retain the authorized inbox, unread counts, realtime reconciliation and existing
read/delete actions. Display errors, blocked permission and disabled browser
categories never prevent inbox refresh. Generic previews omit notification bodies;
delivery rechecks the owner/session and closes displayed previews on cleanup.

## Operations and limits

Restart the API process to register the resident socket channel. The socket/query
integration itself needs no new dependency or schema change. Announcement catch-up
additionally requires `server/src/database/migrations/2026-10-18-resident-announcement-inbox.sql`
on existing databases. It was applied to the configured database with user approval
on 2026-10-18; other environments still require the migration.
These emitters assume one API process; multi-process
deployment requires shared Socket.IO delivery/pub-sub. Direct database edits have
no event and are discovered by the fallback reads. An offline browser cannot receive
updates until it reconnects.

Tests cover shared requests, address/account boundaries, preserved local drafts,
ordered writes/session changes, event batching and fallback, newer GPS versus late
HTTP, socket authorization/revocation, and a real local Socket.IO connection. Live
production records are not modified by these tests.
