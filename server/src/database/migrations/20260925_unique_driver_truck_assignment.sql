-- Check and resolve existing duplicate assignments before applying this key:
-- SELECT truck_id, COUNT(*) AS collectors
-- FROM drivers WHERE truck_id IS NOT NULL
-- GROUP BY truck_id HAVING COUNT(*) > 1;
-- NULL remains allowed for collectors without a truck.
ALTER TABLE drivers ADD UNIQUE KEY uq_drivers_truck (truck_id);
