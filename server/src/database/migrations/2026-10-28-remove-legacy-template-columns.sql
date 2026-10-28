-- Existing databases: use scripts/remove-legacy-template-columns.cjs.
-- Do not execute this file directly against a running API. The runner checks
-- defaults/dependencies, requires stopped writers and explicit apply flags,
-- verifies a private backup, and compares retained data after each table drop.
-- Deploy the compatible server code before restarting services.
-- Actual route_runs, route_run_stops, notifications and GPS are unchanged.
ALTER TABLE users DROP COLUMN two_factor;
ALTER TABLE routes DROP COLUMN collection_started_at;
ALTER TABLE route_stops
  DROP COLUMN status,
  DROP COLUMN completed_at,
  DROP COLUMN notified_at,
  DROP COLUMN collection_done_notified_at,
  DROP COLUMN collection_skipped_notified_at,
  DROP COLUMN skipped_reason;
