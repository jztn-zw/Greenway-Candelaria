-- Apply only after authorization and a verified private schema/data backup.
-- Existing streets remain selectable; no street or history is deleted/backfilled.
ALTER TABLE barangay_streets
  ADD COLUMN deleted_at DATETIME DEFAULT NULL,
  ADD COLUMN live_identity TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL,
  DROP INDEX uq_barangay_street_identity,
  ADD UNIQUE KEY uq_barangay_street_identity (barangay_id, name_key, area_key, live_identity);
-- Stop APIs/workers before applying; deploy compatible API before restarting.
-- Rollback requires retaining archived markers and resolving duplicate archived
-- names first. Do not drop markers or restore a backup over newer live history.
