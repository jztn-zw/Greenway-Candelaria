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
not kept visible after a 403/404. Refreshing does not create new notifications or
change notification delivery preferences.

## Operations and limits

Restart the API process to register the resident socket channel. No schema change
or new dependency is needed. These emitters assume one API process; multi-process
deployment requires shared Socket.IO delivery/pub-sub. Direct database edits have
no event and are discovered by the fallback reads. An offline browser cannot receive
updates until it reconnects.

Tests cover shared requests, address/account boundaries, preserved local drafts,
ordered writes/session changes, event batching and fallback, newer GPS versus late
HTTP, socket authorization/revocation, and a real local Socket.IO connection. Live
production records are not modified by these tests.
