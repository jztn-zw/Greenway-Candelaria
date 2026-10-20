-- Back up barangay_streets and verify INFORMATION_SCHEMA before applying once.
-- Existing road geometry and route run snapshots are unchanged.
ALTER TABLE barangay_streets ADD COLUMN coverage_edit JSON DEFAULT NULL AFTER coverage_path;
