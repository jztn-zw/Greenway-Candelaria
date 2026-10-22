-- Apply with scripts/migrate-resident-proximity.cjs after approval and backup.
-- The runner also seeds receipts for previously broadcast approaching alerts.
CREATE TABLE `route_run_proximity_receipts` (
  `route_run_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`route_run_id`,`user_id`),
  KEY `idx_proximity_receipt_user` (`user_id`),
  CONSTRAINT `fk_proximity_receipt_run` FOREIGN KEY (`route_run_id`) REFERENCES `route_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proximity_receipt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
