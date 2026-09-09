-- Actual collection start time is separate from the admin's scheduled departure time.
ALTER TABLE routes
  ADD COLUMN collection_started_at DATETIME NULL AFTER start_time;
