-- Apply only after authorization and a verified private schema/data backup.
-- Existing streets remain selectable; no street or history is deleted/backfilled.
-- TiDB resolves generated-column dependencies before a multi-action ALTER;
-- add the referenced column first, then create its generated key.
ALTER TABLE barangay_streets ADD COLUMN deleted_at DATETIME DEFAULT NULL;
-- Keep a standalone parent index before replacing the identity index, which
-- currently also supports the barangay foreign key.
ALTER TABLE barangay_streets ADD KEY idx_barangay_streets_barangay (barangay_id);
ALTER TABLE barangay_streets ADD COLUMN live_identity TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL;
-- TiDB does not support dropping and re-adding the same index name in one ALTER.
-- Establish the new uniqueness guarantee before removing the old one.
ALTER TABLE barangay_streets ADD UNIQUE KEY uq_barangay_street_live_identity (barangay_id, name_key, area_key, live_identity);
ALTER TABLE barangay_streets DROP INDEX uq_barangay_street_identity;
-- Stop APIs/workers before applying; deploy compatible API before restarting.
-- Rollback requires retaining archived markers and resolving duplicate archived
-- names first. Do not drop markers or restore a backup over newer live history.
