-- Older immediately-published announcements used the app server's local
-- wall-clock value for sent_at while this database stores timestamps in UTC.
-- Normalize only the exact +8-hour Philippines offset pattern.
UPDATE announcements
SET sent_at = created_at
WHERE status = 'ACTIVE'
  AND scheduled_at IS NULL
  AND sent_at = DATE_ADD(created_at, INTERVAL 8 HOUR);
