# Web truck tracking: behavior and deployment

Scope: the web client and shared server. No mobile app files were changed or tested.

## Deployment

Apply `src/database/migrations/20260926_tracking_consistency.sql` once, after earlier migrations, **before starting the updated server**. Fresh installations use the updated `schema.sql` instead. This migration was applied to the configured database on September 26, 2026; do not reapply it there. Column creation and index creation use separate statements for TiDB compatibility.

The migration preserves existing GPS history and adds an indexed latest-location table, capture/sample identity, persisted pause duration, and GPS outage state. The latest-location table starts empty: existing active runs become visible after their next accepted GPS sample. Pauses before this migration cannot be reconstructed from the old browser-only timer. An already paused run starts its persisted pause interval at migration time.

Optional server settings:

- `ROUTING_BASE_URL`: an OSRM driving-route endpoint, ending in `/route/v1/driving`. The current deployment and example use `https://router.project-osrm.org/route/v1/driving` to restore road-following routes. The backend sends route coordinates to that public provider; requests contain no account names, tokens, or driver identifiers. Use a self-hosted endpoint to keep routing private. Leaving it empty uses a local straight-line distance/travel estimate. Browser routing requests go through the authenticated backend.
- `TRACKING_RETENTION_DAYS`: an explicitly chosen integer of at least 7. When set, the monitor removes at most 5,000 older GPS records per hourly cleanup pass. Leaving it unset preserves history; it does not enable automatic deletion. Review retention and backup requirements before setting it.

The map still uses OpenStreetMap tiles. Tile requests reveal the browser's IP and viewed map region to the tile provider. Configuring a private tile service is a separate deployment decision.

## Scenarios

1. If an enabled route is scheduled for today and its collector/truck are available, the scheduler creates a dated run with a snapshot of its stops. It remains scheduled until the collector starts it.
2. If the collector opens the panel before the scheduled time, they can see the plan; starting early is also rejected by the server.
3. If the collector starts today's assigned run, it becomes active, the timer starts, GPS starts, and eligible residents of the first pending stop receive “Your Area Is Next.”
4. If the collector moves between pages inside the collector web panel, GPS continues through the shared layout.
5. If the collector closes the web app or logs out, browser tracking stops. Closing a tab does not mean the route was completed.
6. If the browser has no location permission or cannot obtain GPS, the collector sees an explanation. The map does not invent a truck position.
7. If a fresh, assigned-run GPS sample is received, the server saves it to history and updates the latest position.
8. If a sample belongs to a paused, ended, unstarted, unavailable, reassigned or previous-day run, it is rejected. It cannot change truck status or reopen a route.
9. If a sample repeats an ID, is older than the latest accepted capture, or arrives less than three seconds after it, it does not create another accepted position. Captures older than two minutes or more than five seconds in the future are rejected.
10. If the collector loses internet, the web app waits for a fresh GPS fix after reconnection. It does not replay an old offline trail as current movement.
11. If the truck comes within 750 metres of its next pending stop's street path (or legacy barangay point), eligible residents of that stop receive one “Truck Approaching” notification.
12. If the collector comes within 150 metres of the current street path, the collector page shows the proximity indicator using actual fresh GPS distance. This indicator does not automatically complete the stop.
13. If the collector marks the current stop done, it records the completion time and eligible residents of that stop receive “Collection Completed.” They do not have to wait for the entire truck route to finish.
14. If a stop is street-specific, only active residents registered to that barangay AND street are eligible. A whole-barangay stop applies to active registered residents throughout that barangay.
15. If the collector skips the current stop, a reason is required. Eligible residents receive “Collection Skipped” with that reason.
16. If a stop is done or missed, repeating the same action preserves its original outcome/time and does not duplicate notices. Changing a terminal outcome or jumping ahead of the next pending stop is rejected.
17. If more stops remain after completion/skipping, the next pending stop becomes the target and its eligible residents receive the next-area notice once.
18. If the collector pauses, new GPS and stop changes are blocked. Residents/admins see the pause; a last known position can remain visible as paused. The timer excludes the break, including after a page refresh.
19. If the collector resumes, GPS and stop actions restart. The stored pause duration is retained and the GPS-loss monitor receives a new two-minute grace period.
20. If all stops become done, the run closes automatically as COMPLETED. If every stop is terminal but at least one was missed, it closes as PARTIAL.
21. If the collector ends early, unfinished stops become missed, their eligible residents receive missed-collection notices, and already completed stops retain their outcome.
22. If a run closes, eligible admins receive one summary with completed/missed totals. Its live position and outstanding GPS-loss alert are cleared. Concurrent pause/end/late-GPS requests cannot reopen it.
23. If a resident's own stop is done or missed, that outcome remains available, but they no longer receive live coordinates for that run unless it still has another unfinished stop matching their registered area.
24. If an active run has no fresh GPS for two minutes, the next monitor pass alerts eligible admins. The monitor runs every minute, so actual detection is approximately two to three minutes. Paused runs do not trigger this alert.
25. If fresh GPS returns, the outage alert is cleared. A later separate outage can generate a new alert.
26. If a notification insert fails, its related stop/GPS transition and all notification chunks roll back together. Stored notices remain available through the notification list if immediate socket delivery fails.
27. If a resident disables the relevant notification setting, they do not receive that type of notice. Collection reminders also respect the reminder master switch. Admin summaries/GPS alerts respect the admin route-issues setting.
28. If an admin tries to change truck status manually, the server rejects it. Tracking's manual-offline button was removed. Truck state follows routes/GPS.
29. If an admin reassigns a collector with an active, paused or today's scheduled run, the change is rejected until the run is finished/cancelled. Truck availability also cannot be changed while an applicable run remains.
30. If an account is deactivated, authentication and subsequent socket deliveries are revoked. The monitor cancels unstarted unavailable runs or closes started unavailable runs, preserving completed stops and marking unfinished stops missed.
31. If the collection day changes, old unstarted runs are cancelled and unfinished started runs are finalized. Yesterday's paused run cannot keep blocking current-day GPS indefinitely.
32. If an admin changes the recurring schedule, dated completed history stays intact. A started run cannot have its stop plan replaced underneath collection.
33. If a resident opens tracking, the server limits trucks/routes/stops to their registered area, omits collector identity and truck plates, and sends no unrelated fleet-wide socket payload.
34. If a collector requests tracking, only the assigned truck is included. Admins retain fleet visibility and access to GPS replay/history.
35. If a session is revoked, expires, or its user is banned/deactivated, later socket deliveries recheck the database instead of trusting the original room membership.
36. If an ETA is displayed, it is a travel estimate, not a guaranteed collection-arrival time. The count of preceding stops comes from the full server-side route while other areas' coordinates remain private. Estimates exclude time spent collecting at those stops.
37. If road routing is unavailable/unconfigured, the app uses a clearly labelled straight-line estimate. Routing requests/caches are bounded and shared; it does not silently retry public routing providers from the browser.
38. If an admin replays a long day, the client follows cursor pages instead of silently stopping at 5,000 records. Day boundaries use Philippine time; recorded instants are UTC and outcomes come from dated run snapshots.
39. If an admin clears GPS history, it does not change the route or force the live truck offline.
40. If a route request fails, the collector sees an error rather than a false “no route assigned” message. Resident live events reuse cached plan data, with periodic reconciliation and stale-response protection.

## Verification and limits

Local results: 60 server tests and 14 client tests pass. The client TypeScript check, tracking-scoped ESLint check, server JavaScript syntax checks and web production build pass. Repository-wide `npm run lint` still reports errors outside the modified tracking files. The production build reports existing bundle-size, browser-data-age and CSS utility warnings.

Regression tests cover terminal-action idempotency, stop ordering, notification rollback, pause/end serialization, invalid/duplicate/old GPS, repeated outage/recovery, role-scoped output, history pagination, session revocation, and browser GPS callback cleanup. Related resident/admin/report tests are also run.

Transaction and query behavior is covered by fixture-based tests. After applying the migration to the configured database, the admin overview and admin live-snapshot service queries succeeded; all 7,486 existing GPS history rows and four route runs were preserved, and every history row had its capture time backfilled. The scoped lifecycle, tracking, and socket regression suite passed all 20 tests. Authenticated HTTP delivery, real device GPS, browser background throttling, and real multi-user sockets still require a staging smoke test. Browser coordinates are supplied by the device/client and are not cryptographic proof of a truck's physical location.

Suggested staging sequence: use two residents on different streets, one collector and one admin; start a run, send GPS near the first street, pause/reload/resume, complete one street, skip another, verify each resident's distinct notices, then repeat the terminal request and verify that no duplicate notice is saved. Disconnect/reconnect GPS twice and revoke one connected session. Replay a day with more than 5,000 saved points.
