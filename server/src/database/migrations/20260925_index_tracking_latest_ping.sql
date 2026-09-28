-- Keep latest-per-truck reads efficient as GPS history grows.
ALTER TABLE tracking_logs
  ADD INDEX idx_tracking_logs_truck_latest (truck_id, created_at, id);
