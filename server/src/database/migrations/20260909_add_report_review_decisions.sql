ALTER TABLE reports
  ADD COLUMN duplicate_reason TEXT NULL AFTER duplicate_of_id,
  ADD COLUMN false_reason TEXT NULL AFTER duplicate_reason,
  ADD COLUMN duplicate_flagged_by VARCHAR(36) NULL AFTER false_reason,
  ADD COLUMN false_flagged_by VARCHAR(36) NULL AFTER duplicate_flagged_by,
  ADD COLUMN duplicate_flagged_at DATETIME NULL AFTER false_flagged_by,
  ADD COLUMN false_flagged_at DATETIME NULL AFTER duplicate_flagged_at;
