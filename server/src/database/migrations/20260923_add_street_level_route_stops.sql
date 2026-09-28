-- Keep the existing barangay ID for resident notifications and add an optional
-- operational stop point for street-level collection routes.
ALTER TABLE route_stops
  ADD COLUMN collection_stop_point_id VARCHAR(36) NULL AFTER barangay_id;

ALTER TABLE route_stops
  ADD KEY idx_route_stops_collection_stop_point (collection_stop_point_id);

ALTER TABLE route_stops
  ADD CONSTRAINT fk_route_stops_collection_stop_point
  FOREIGN KEY (collection_stop_point_id) REFERENCES collection_stop_points(id)
  ON DELETE RESTRICT;

-- Route runs are historical snapshots, so persist the display name used on the
-- day of collection as well as the source collection point.
ALTER TABLE route_run_stops
  ADD COLUMN collection_stop_point_id VARCHAR(36) NULL AFTER barangay_id;

ALTER TABLE route_run_stops
  ADD COLUMN stop_name VARCHAR(180) NULL AFTER collection_stop_point_id;

ALTER TABLE route_run_stops
  ADD KEY idx_route_run_stops_collection_stop_point (collection_stop_point_id);

ALTER TABLE route_run_stops
  ADD CONSTRAINT fk_route_run_stops_collection_stop_point
  FOREIGN KEY (collection_stop_point_id) REFERENCES collection_stop_points(id)
  ON DELETE RESTRICT;
