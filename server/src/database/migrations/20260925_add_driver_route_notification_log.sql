-- Guarantee one route-notification digest and one start-time alert per driver.
CREATE TABLE IF NOT EXISTS `driver_route_notification_log` (
  `id` varchar(36) NOT NULL,
  `driver_user_id` varchar(36) NOT NULL,
  `collection_date` date NOT NULL,
  `notification_kind` enum('DAILY_DIGEST','START_TIME') NOT NULL,
  `scheduled_start_time` varchar(10) NOT NULL DEFAULT '',
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_driver_route_notification` (`driver_user_id`, `collection_date`, `notification_kind`, `scheduled_start_time`),
  KEY `idx_driver_route_notification_date` (`collection_date`),
  CONSTRAINT `fk_driver_route_notification_user`
    FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
