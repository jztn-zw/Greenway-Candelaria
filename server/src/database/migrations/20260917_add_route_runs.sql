-- Keep routes as recurring templates. Each scheduled collection date receives
-- one independent route run and an immutable copy of its ordered stops.
CREATE TABLE route_runs (
  id varchar(36) NOT NULL,
  route_id varchar(36) NOT NULL,
  run_date date NOT NULL,
  truck_id varchar(36) NOT NULL,
  driver_id varchar(36) DEFAULT NULL,
  route_name varchar(100) DEFAULT NULL,
  waste_type enum('Biodegradable','Non-Biodegradable') DEFAULT NULL,
  scheduled_start_time varchar(10) NOT NULL,
  status enum('SCHEDULED','ACTIVE','PAUSED','COMPLETED','PARTIAL','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  collection_started_at datetime DEFAULT NULL,
  ended_at datetime DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_route_runs_template_date (route_id, run_date),
  KEY idx_route_runs_date_status (run_date, status),
  KEY idx_route_runs_driver_date (driver_id, run_date),
  KEY idx_route_runs_truck_date (truck_id, run_date),
  CONSTRAINT fk_route_runs_template FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_runs_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_runs_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE route_run_stops (
  id varchar(36) NOT NULL,
  route_run_id varchar(36) NOT NULL,
  template_stop_id varchar(36) DEFAULT NULL,
  barangay_id varchar(36) NOT NULL,
  stop_order int NOT NULL,
  status enum('NOT_STARTED','IN_PROGRESS','DONE','MISSED') NOT NULL DEFAULT 'NOT_STARTED',
  completed_at datetime DEFAULT NULL,
  notified_at datetime DEFAULT NULL,
  collection_done_notified_at datetime DEFAULT NULL,
  collection_skipped_notified_at datetime DEFAULT NULL,
  skipped_reason varchar(255) DEFAULT NULL,
  distance_km decimal(8,2) DEFAULT '0',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_route_run_stops_run_order (route_run_id, stop_order),
  KEY idx_route_run_stops_barangay (barangay_id),
  CONSTRAINT fk_route_run_stops_run FOREIGN KEY (route_run_id) REFERENCES route_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_run_stops_template FOREIGN KEY (template_stop_id) REFERENCES route_stops(id) ON DELETE SET NULL,
  CONSTRAINT fk_route_run_stops_barangay FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
