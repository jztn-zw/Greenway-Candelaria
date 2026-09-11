-- The MENRO schedule manager is internal-only.  Resident calendar entries are
-- created only from an announcement that an admin explicitly opts into showing.
ALTER TABLE schedules
  ADD COLUMN announcement_id VARCHAR(36) NULL AFTER created_by;

ALTER TABLE schedules
  ADD UNIQUE KEY uq_schedules_announcement (announcement_id),
  ADD KEY idx_schedules_announcement (announcement_id),
  ADD CONSTRAINT fk_schedules_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
