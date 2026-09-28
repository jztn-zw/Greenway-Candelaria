-- Apply once before deploying the tracking changes. Historical rows are preserved.
ALTER TABLE route_runs
  ADD COLUMN paused_at DATETIME(3) NULL,
  ADD COLUMN total_paused_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN gps_expected_since DATETIME(3) NULL,
  ADD COLUMN gps_alert_at DATETIME(3) NULL;
-- An in-progress deployment cannot recover pauses recorded only in browser memory.
UPDATE route_runs SET paused_at = UTC_TIMESTAMP(3)
  WHERE status = 'PAUSED' AND collection_started_at IS NOT NULL AND paused_at IS NULL;
UPDATE route_runs SET gps_expected_since = UTC_TIMESTAMP(3)
  WHERE status = 'ACTIVE' AND collection_started_at IS NOT NULL AND gps_expected_since IS NULL;
ALTER TABLE tracking_logs
  ADD COLUMN route_run_id VARCHAR(36) NULL,
  ADD COLUMN sample_id VARCHAR(36) NULL,
  ADD COLUMN captured_at DATETIME(3) NULL;
-- TiDB requires new columns to exist before validating indexes over them.
ALTER TABLE tracking_logs
  ADD UNIQUE KEY uq_tracking_sample (sample_id),
  ADD KEY idx_tracking_capture (truck_id, captured_at, id);
UPDATE tracking_logs SET captured_at = created_at WHERE captured_at IS NULL;
CREATE TABLE tracking_latest (
  truck_id VARCHAR(36) NOT NULL PRIMARY KEY,
  route_run_id VARCHAR(36) NOT NULL,
  driver_id VARCHAR(36) NOT NULL,
  sample_id VARCHAR(36) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  captured_at DATETIME(3) NOT NULL,
  received_at DATETIME(3) NOT NULL,
  KEY idx_tracking_latest_run (route_run_id),
  CONSTRAINT fk_tracking_latest_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
