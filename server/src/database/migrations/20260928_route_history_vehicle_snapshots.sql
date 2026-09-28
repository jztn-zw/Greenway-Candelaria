-- Preserve the vehicle identity used for each collection shift.
-- Historical completed runs are intentionally not backfilled with today's
-- vehicle identity: their original names/plates cannot be inferred reliably.
ALTER TABLE route_runs
  ADD COLUMN truck_name_snapshot VARCHAR(255) NULL,
  ADD COLUMN truck_plate_snapshot VARCHAR(255) NULL;
UPDATE route_runs rr JOIN trucks t ON t.id = rr.truck_id
SET rr.truck_name_snapshot = t.name, rr.truck_plate_snapshot = t.plate_number
WHERE rr.status IN ('SCHEDULED', 'ACTIVE', 'PAUSED');
