-- Older collector updates passed JavaScript Date values through a connection
-- whose database timezone is UTC. Those values were already Manila local time,
-- so completed checkpoints were stored eight hours ahead. Route starts and
-- automatic end-route misses already use UTC_TIMESTAMP() and are unaffected.
UPDATE route_stops
SET completed_at = DATE_SUB(completed_at, INTERVAL 8 HOUR)
WHERE completed_at IS NOT NULL
  AND (
    status = 'DONE'
    OR (status = 'MISSED' AND skipped_reason IS NOT NULL)
  );
