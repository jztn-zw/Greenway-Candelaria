-- A truck can operate one recurring collection route per weekday.
ALTER TABLE routes
  ADD CONSTRAINT uq_routes_truck_day UNIQUE (truck_id, day_of_week);
