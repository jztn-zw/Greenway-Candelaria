-- Back up the users table definition and verify INFORMATION_SCHEMA first.
-- Apply once before deploying the website location picker. Existing accounts
-- retain NULL; no location is inferred or backfilled. No tracking tables change.
ALTER TABLE users ADD COLUMN resident_location JSON DEFAULT NULL AFTER street_id;
-- Rollback (only after disabling new location writes and backing up values):
-- ALTER TABLE users DROP COLUMN resident_location;
