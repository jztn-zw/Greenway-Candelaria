-- Separate resident preferences and per-stop delivery markers for collection-status alerts.
ALTER TABLE `user_settings`
  ADD COLUMN `notif_collection_done` TINYINT(1) DEFAULT 1 AFTER `notif_truck_near`;

ALTER TABLE `user_settings`
  ADD COLUMN `notif_collection_skipped` TINYINT(1) DEFAULT 1 AFTER `notif_collection_done`;

ALTER TABLE `route_stops`
  ADD COLUMN `collection_done_notified_at` TIMESTAMP NULL DEFAULT NULL AFTER `notified_at`;

ALTER TABLE `route_stops`
  ADD COLUMN `collection_skipped_notified_at` TIMESTAMP NULL DEFAULT NULL AFTER `collection_done_notified_at`;
