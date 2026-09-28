-- Run the duplicate check before this migration on each deployment database:
-- SELECT barangay_id, LOWER(TRIM(name)) AS name_key,
--        LOWER(COALESCE(TRIM(area), '')) AS area_key, COUNT(*) AS copies
-- FROM barangay_streets
-- GROUP BY barangay_id, name_key, area_key HAVING COUNT(*) > 1;
-- Resolve any returned rows before adding the unique key.
ALTER TABLE barangay_streets
  ADD COLUMN name_key VARCHAR(150) GENERATED ALWAYS AS (LOWER(TRIM(name))) VIRTUAL,
  ADD COLUMN area_key VARCHAR(100) GENERATED ALWAYS AS (LOWER(COALESCE(TRIM(area), ''))) VIRTUAL;

ALTER TABLE barangay_streets
  ADD UNIQUE KEY uq_barangay_street_identity (barangay_id, name_key, area_key);

ALTER TABLE barangay_streets
  DROP INDEX uq_barangay_street_name_area;
