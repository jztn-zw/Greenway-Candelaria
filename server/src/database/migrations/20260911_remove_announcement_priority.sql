-- Announcement type now fully communicates notice urgency; priority is redundant.
ALTER TABLE announcements
  DROP COLUMN priority;
