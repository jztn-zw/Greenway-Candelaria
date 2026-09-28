-- Route templates are the source of collection times. Preserve the legacy
-- collection_schedule tables for historical data, but log new reminders by route.
CREATE TABLE IF NOT EXISTS `route_collection_reminder_log` (
  `id` varchar(36) NOT NULL,
  `route_id` varchar(36) NOT NULL,
  `collection_date` date NOT NULL,
  `reminder_timing` int NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_route_collection_reminder` (`route_id`, `collection_date`, `reminder_timing`),
  CONSTRAINT `fk_route_collection_reminder_route` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
