-- The weekly collection rules are now the source of truth for the admin and
-- resident schedules. Existing rows are preserved and receive the standard
-- collection start time only when a time has not already been recorded.
ALTER TABLE collection_schedule
  ADD COLUMN start_time TIME NULL;

ALTER TABLE collection_schedule
  ADD COLUMN end_time TIME NULL;

UPDATE collection_schedule
SET start_time = '06:00:00'
WHERE start_time IS NULL;

ALTER TABLE collection_schedule
  MODIFY COLUMN start_time TIME NOT NULL;

-- A unique delivery record makes reminder processing safe when the server
-- restarts or when more than one scheduler instance is running.
CREATE TABLE collection_schedule_reminder_log (
  id VARCHAR(36) NOT NULL,
  schedule_id VARCHAR(36) NOT NULL,
  collection_date DATE NOT NULL,
  reminder_timing INT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collection_schedule_reminder (schedule_id, collection_date, reminder_timing),
  CONSTRAINT fk_collection_schedule_reminder_schedule
    FOREIGN KEY (schedule_id) REFERENCES collection_schedule(id) ON DELETE CASCADE
);
