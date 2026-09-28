ALTER TABLE route_run_stops
  ADD COLUMN coverage_path JSON DEFAULT NULL AFTER stop_name;

UPDATE route_run_stops rrs
JOIN route_runs rr ON rr.id = rrs.route_run_id
JOIN barangay_streets bs ON bs.id = rrs.street_id
SET rrs.coverage_path = bs.coverage_path
WHERE rrs.coverage_path IS NULL
  AND rr.status IN ('SCHEDULED', 'ACTIVE', 'PAUSED');
