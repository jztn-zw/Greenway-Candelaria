-- Additive migration for an existing database. Review and back up first.
-- No data reset, route changes or session credentials are stored here.
CREATE TABLE IF NOT EXISTS `mobile_push_devices` (
  `token` varchar(255) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `platform` enum('android','ios') NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `push_user` (`user_id`),
  KEY `push_session` (`session_id`),
  CONSTRAINT `fk_push_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_push_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
