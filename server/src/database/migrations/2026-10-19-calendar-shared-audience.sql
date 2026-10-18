-- Review and back up the schedules table definition before applying.
-- Adds a visibility value; existing PRIVATE/PUBLIC rows keep their audience.
-- PRIVATE = MENRO, PUBLIC = residents, SHARED = MENRO and residents.
ALTER TABLE schedules
  MODIFY COLUMN visibility ENUM('PRIVATE','PUBLIC','SHARED') NOT NULL DEFAULT 'PRIVATE';
