-- Announcement archive lifecycle: retain an archived notice for 30 days before
-- the scheduler permanently purges it. Existing archived records are retained.
ALTER TABLE announcements
  ADD COLUMN archived_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

UPDATE announcements
SET archived_at = COALESCE(updated_at, NOW())
WHERE status = 'ARCHIVED' AND archived_at IS NULL;
