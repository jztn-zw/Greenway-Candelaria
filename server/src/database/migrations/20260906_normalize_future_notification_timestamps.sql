-- Announcement notifications are never scheduled for the future. Correct
-- records written with the previous local (UTC+8) wall-clock serialization.
UPDATE notifications
SET created_at = DATE_SUB(created_at, INTERVAL 8 HOUR)
WHERE ref_module = 'announcements'
  AND created_at > NOW();
