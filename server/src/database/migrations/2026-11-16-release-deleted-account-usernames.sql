-- Data-only backfill. See the database README before applying.
UPDATE users
SET username = NULL, updated_at = updated_at
WHERE deleted_at IS NOT NULL
  AND username IS NOT NULL
  AND role IN ('RESIDENT', 'DRIVER');
