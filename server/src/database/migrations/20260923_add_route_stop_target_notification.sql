ALTER TABLE route_run_stops
  ADD COLUMN target_notified_at DATETIME NULL DEFAULT NULL AFTER notified_at;
