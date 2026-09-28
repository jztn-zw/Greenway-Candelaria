-- Historical route runs and tracking logs must block truck deletion.
ALTER TABLE route_runs
  DROP FOREIGN KEY fk_route_runs_truck,
  ADD CONSTRAINT fk_route_runs_truck_restrict FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT;

ALTER TABLE tracking_logs
  DROP FOREIGN KEY fk_1,
  ADD CONSTRAINT fk_tracking_logs_truck_restrict FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT;
