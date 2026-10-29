-- Review INFORMATION_SCHEMA.COLUMNS for reports.resident_hidden_at first.
-- Back up and checksum the reports definition/data before an authorized upgrade.
-- Apply once before deploying the compatible reports API. No backfill is needed:
-- all existing reports stay visible to their owners and admins.
ALTER TABLE reports ADD COLUMN resident_hidden_at DATETIME DEFAULT NULL AFTER deleted_at;

-- Rollback only after stopping compatible writers and backing up hidden markers:
-- ALTER TABLE reports DROP COLUMN resident_hidden_at;
-- Dropping the marker makes removed resolved reports visible to residents again.
