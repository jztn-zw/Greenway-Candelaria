ALTER TABLE barangay_streets
  ADD COLUMN coverage_path JSON DEFAULT NULL AFTER area;
