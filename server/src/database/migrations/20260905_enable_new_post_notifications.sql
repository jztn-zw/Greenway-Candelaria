-- New resident settings should receive newly published post notifications.
ALTER TABLE `user_settings`
  MODIFY COLUMN `notif_new_content` TINYINT(1) DEFAULT 1;

-- The previous default was disabled, while the resident UI had no control for it.
-- Enable existing accounts so they receive post notifications by default as well.
UPDATE `user_settings`
SET `notif_new_content` = 1
WHERE `notif_new_content` = 0;
