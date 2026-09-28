ALTER TABLE `user_settings`
  ADD COLUMN `notif_admin_reports` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `notif_admin_route_issues` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `notif_admin_driver_messages` TINYINT(1) NOT NULL DEFAULT 1;
