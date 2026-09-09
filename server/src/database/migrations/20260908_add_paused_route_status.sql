-- A paused route keeps its unfinished stops and last known location, but does
-- not accept GPS pings or collection-status changes until it is resumed.
ALTER TABLE routes
  MODIFY COLUMN status ENUM('ACTIVE', 'PAUSED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE';
