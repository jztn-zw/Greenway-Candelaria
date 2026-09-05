-- Scheduled post times created before the UTC fix were saved as Philippine
-- local time in a UTC database clock. GreenWay operates in UTC+08:00.
UPDATE `posts`
SET `scheduled_at` = DATE_SUB(`scheduled_at`, INTERVAL 8 HOUR)
WHERE `status` = 'SCHEDULED'
  AND `scheduled_at` IS NOT NULL;
