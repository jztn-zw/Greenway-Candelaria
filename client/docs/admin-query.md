# Admin server state

Admin web modules use the existing TanStack Query v5 dependency through
`src/lib/adminQuery.ts`. Axios services still own the HTTP contracts. Form fields,
dialogs, map rendering, and replay playback remain component state.

## Coverage

| Module | Cached reads and managed writes |
| --- | --- |
| Dashboard | Summary, charts, operations, activity, calendar |
| Community posts | Filtered pages, details, uploads, create/edit/delete/duplicate |
| Announcements | Filtered pages, recipients, receipts, publishing, archive, resend |
| Schedule | Internal events and dashboard calendar; create/edit/delete |
| Routes | Routes, barangays, streets, drivers, trucks; create/edit/toggle/delete/duplicate |
| Barangays | Service availability, streets, coverage paths; management actions |
| Residents | Filtered pages, counts, profile/reports; status changes and deletion |
| Collectors and trucks | Lists, profiles, driver activity; management and password reset |
| Waste reports | Filtered pages, details, duplicate lookup; status, notes, flags, deletion |
| Truck tracking | Overview, missed collections, replay history, road route lookup, dispatch messages |
| Analytics | Filtered dashboard and barangay options |
| Audit logs | Filtered pages and summary counts |
| Notifications | Bounded topbar windows and category pages, read/clear actions, socket refresh |
| Profile | Account details, profile and password updates |
| Settings | Alert preferences |

## Cache and update rules

Duplicating a route opens a local draft with copied stops and start time, and blank
truck/collector assignments. Continuing to the editor does not create a route or show
a success toast. Saving uses the normal create mutation; cancellation discards the
draft. Selecting a collector automatically fills their existing linked truck as
read-only information; there is no separate truck selector. Occupied trucks
remain unavailable for the chosen day.

- Keys include the authenticated admin ID, domain, filters, page, and detail ID.
  Changing filters selects a different cache entry. An older response cannot
  replace the entry for the current filters.
- Ordinary reads remain fresh for 30 seconds. Matching consumers share requests.
  Stale active data refreshes on window focus/reconnection. Explicit detail and
  replay reads use `fetchQuery` with zero stale time.
- Dashboard/calendar/analytics/notifications reconcile every 60 seconds while
  visible. Missed collections reconcile every 30 seconds. Tracking retains its
  existing connected/fallback intervals and newer-socket-data guard. TanStack
  owns those HTTP timers; socket events still deliver live updates.
- Writes use mutations with retries disabled. A successful save invalidates the
  affected domains plus dashboard, analytics, and audit. Active queries refresh;
  inactive queries reload when visited. A refresh failure does not label a saved
  write as failed. API errors and existing validation remain visible.
- For example, saving a route invalidates route lists, tracking, collector/truck
  choices, schedule data, dashboard, analytics, and audit. Updating a report also
  invalidates resident details and notifications.
- Cache storage is in memory. Changing account, role, or authentication token
  creates a new QueryClient, clears the old cache, and remounts view state.
  Query keys contain no passwords or authentication tokens. Mutation entries
  have zero retention after their observer releases them.
- Notification and admin change socket ownership is at the admin layout. Topbar and history
  use the same account-scoped query domain rather than creating separate socket owners.
  Each request includes full unread/recent/history counts, while records are fetched
  only for the visible menu window or selected 15-row category page. Expanding a
  menu fetches additional rows; refreshes do not download the entire history.
  Collector-message badges count saved unread incoming messages independently of
  alert preferences or cleared notifications. A focused, visible message bubble
  saves its read flag; failures remain retryable. The existing single-admin schema
  and collector message read flags are preserved; no migration is required.

## Automatic updates from other users

`AdminLiveSync` listens for `admin:data-changed`. Successful API writes publish
affected domain names through `server/src/middleware/adminChanges.js`. Scheduled
post publishing, announcement activation/expiry/purge, and route broadcasts also
publish changes after saving. Report refreshes do not depend on notification
preferences or successful notification delivery.

- Example: a resident saves report 29 while an admin sees 28. The admin receives
  a `reports` change, refetches the current filtered query, and sees the new total
  and matching records. A filter still excludes records that do not match it.
- The server groups events for 150 ms; the client groups list changes for 300 ms.
  These are batching delays, not guaranteed delivery times. Network and database
  response times still apply. Dashboard and analytics events use a 2-second batch.
- Only active queries fetch immediately. Inactive screens become stale. Events
  never reset search, sort, pagination or the selected record. A server may still
  clamp a page if deletion removes its final page.
- Every 60 seconds, visible admin lists and audit logs reconcile missed changes.
  Tracking, notification, dashboard and analytics keep their existing polling.
  Hidden tabs pause this work and reconcile when visible. Reconnection reconciles
  after the server confirms the authenticated admin subscription.
- Profile, alert settings, messenger threads and audit logs participate in the
  change stream and visible-page fallback. Admin account changes send admin-only
  hints; profile reads also hydrate the signed-in account shown by the layout.
  Standalone audit writes publish only after saving; transactional audit entries
  use the successful API response after commit. Messenger hints do not depend on
  notification preferences. Open post editors keep their draft snapshot.
  Older affected reads are cancelled before an admin mutation starts.
  Report details refresh untouched fields while keeping
  unsaved responses and internal notes. Route editors retain selections and validate
  truck availability on save. Events affecting a pending mutation wait for it to finish.
- Open announcement previews observe their own detail query, independently of
  filters or pagination, and close after a 403/404. A loaded replay observes GPS
  history every 60 seconds while paused; new data preserves the current recorded
  instant. Playback and video export keep a stable snapshot until they stop.
- Dispatch conversation saves and collector/admin read confirmations also publish
  private collector hints after saving. The collector web client accepts only its
  matching owner ID and refreshes chat even when notification alerts are disabled.
  Collector receipt writes refresh admin messenger/tracking caches without waking
  unrelated dashboards or assignments. The mobile Driver uses the same channel.
- Events contain domain names only. The server authenticates the admin both on
  subscription and delivery, removing revoked sessions. Residents and collectors
  cannot join this stream. Normal API authorization still controls every refetch.

No new package or database migration is required. Restart the API when deploying
these server changes. Direct database edits outside the application have no event;
the visible-page reconciliation catches them. Multi-process deployment would need
a shared Socket.IO adapter/event publisher; the current setup is one API process.

Server authorization remains authoritative. This migration does not change route
completion, resident notification recipients, collection schedules, or road
geometry rules. Resident and collector web modules use their own query helpers;
mobile apps keep their existing contracts. The shared provider's cache reset
protects session changes across web roles.

## Validation

- `npm test`: includes request deduplication, related-domain invalidation, failed
  writes, account isolation, report request races, and collector lifecycle tests.
- `node node_modules/typescript/bin/tsc -b --pretty false`
- `npm run build`
- Scoped ESLint on admin modules, `adminQuery`, admin layout, and AppProviders.
- `adminRealtime.test.ts` checks 28-to-29 refresh, batching, filter/account
  isolation, reconnect reconciliation, hidden tabs, cleanup, stale in-flight reads,
  missed events, and pending mutations. Report-detail tests verify draft preservation.
- `server/src/sockets/adminChanges.socket.test.js` checks successful-write routing,
  authorization/revocation, payload minimization and actual Socket.IO delivery on
  an isolated HTTP server with an in-memory report count.

Browser smoke checks use reads only. Automated mutation checks mock the services;
they do not create, delete, or send notifications to real system records.
