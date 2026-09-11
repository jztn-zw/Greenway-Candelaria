-- Internal MENRO schedules are date-based and may span multiple days.
ALTER TABLE schedules
  ADD COLUMN end_date DATE NULL AFTER event_date;
