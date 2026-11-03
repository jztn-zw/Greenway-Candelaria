-- GreenWay baseline schema (2026-10-07).
-- Import into an empty TiDB/MySQL-compatible database.
-- Contains structure only; credentials and private data belong outside source control.
-- Retired migrations are consolidated here. Foreign keys remain enabled.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- barangays
CREATE TABLE `barangays` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `collection_service_available` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_barangays_coords` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- barangay_streets
CREATE TABLE `barangay_streets` (
  `id` varchar(36) NOT NULL,
  `barangay_id` varchar(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `area` varchar(100) DEFAULT NULL,
  `name_key` varchar(150) GENERATED ALWAYS AS (LOWER(TRIM(`name`))) VIRTUAL,
  `area_key` varchar(100) GENERATED ALWAYS AS (LOWER(COALESCE(TRIM(`area`), ''))) VIRTUAL,
  `deleted_at` datetime DEFAULT NULL,
  `live_identity` tinyint GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, 1, NULL)) VIRTUAL,
  `coverage_path` json DEFAULT NULL,
  `coverage_edit` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_barangay_street_live_identity` (`barangay_id`,`name_key`,`area_key`,`live_identity`),
  KEY `idx_barangay_streets_barangay` (`barangay_id`),
  CONSTRAINT `fk_barangay_streets_barangay` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- report_year_counters
CREATE TABLE `report_year_counters` (
  `year` smallint NOT NULL,
  `counter` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- trucks
CREATE TABLE `trucks` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `plate_number` varchar(20) NOT NULL,
  `truck_model` varchar(100) NOT NULL,
  `status` enum('OFFLINE','SCHEDULED','ON_THE_WAY','DONE') DEFAULT 'OFFLINE',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `availability_status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate_number` (`plate_number`),
  CONSTRAINT `chk_availability_status` CHECK ((`availability_status` in (_utf8mb4'ACTIVE',_utf8mb4'UNDER_MAINTENANCE')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- tracking_latest
CREATE TABLE tracking_latest (
  truck_id VARCHAR(36) NOT NULL PRIMARY KEY,
  route_run_id VARCHAR(36) NOT NULL,
  driver_id VARCHAR(36) NOT NULL,
  sample_id VARCHAR(36) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  captured_at DATETIME(3) NOT NULL,
  received_at DATETIME(3) NOT NULL,
  KEY idx_tracking_latest_run (route_run_id),
  CONSTRAINT fk_tracking_latest_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- users
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `recovery_code_hash` char(64) DEFAULT NULL,
  `role` enum('RESIDENT','DRIVER','ADMIN') NOT NULL DEFAULT 'RESIDENT',
  `profile_completed` tinyint(1) NOT NULL DEFAULT '1',
  `status` enum('ACTIVE','DEACTIVATED','BANNED') DEFAULT 'ACTIVE',
  `self_deactivated_at` datetime(3) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `barangay_id` varchar(36) DEFAULT NULL,
  `street_id` varchar(36) DEFAULT NULL,
  `resident_location` json DEFAULT NULL,
  `ban_reason` varchar(255) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` datetime DEFAULT NULL,
  `announcement_inbox_initialized_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_recovery_code_hash` (`recovery_code_hash`),
  KEY `fk_user_barangay` (`barangay_id`),
  KEY `fk_user_street` (`street_id`),
  CONSTRAINT `fk_user_street` FOREIGN KEY (`street_id`) REFERENCES `barangay_streets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_barangay` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- driver_route_notification_log
CREATE TABLE `driver_route_notification_log` (
  `id` varchar(36) NOT NULL,
  `driver_user_id` varchar(36) NOT NULL,
  `collection_date` date NOT NULL,
  `notification_kind` enum('DAILY_DIGEST','START_TIME') NOT NULL,
  `scheduled_start_time` varchar(10) NOT NULL DEFAULT '',
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_driver_route_notification` (`driver_user_id`,`collection_date`,`notification_kind`,`scheduled_start_time`),
  KEY `idx_driver_route_notification_date` (`collection_date`),
  CONSTRAINT `fk_driver_route_notification_user` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- announcements
CREATE TABLE `announcements` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `type` enum('GENERAL_NOTICE','SCHEDULE_CHANGE','HOLIDAY_REMINDER','EMERGENCY_ADVISORY','SYSTEM_MAINTENANCE','COMMUNITY_EVENT') NOT NULL,
  `status` enum('DRAFT','ACTIVE','SCHEDULED','ARCHIVED') DEFAULT 'DRAFT',
  `is_featured` tinyint(1) DEFAULT '0',
  `target_all` tinyint(1) DEFAULT '1',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archived_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`created_by`),
  KEY `idx_announcements_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_announcements_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- audit_logs
CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `record_id` varchar(36) DEFAULT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`user_id`),
  KEY `idx_audit_module_created` (`module`,`created_at`),
  KEY `idx_audit_action_created` (`action`,`created_at`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_logs_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- drivers
CREATE TABLE `drivers` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `truck_id` varchar(36) DEFAULT NULL,
  `status_msg` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `uq_drivers_truck` (`truck_id`),
  KEY `fk_driver_truck` (`truck_id`),
  CONSTRAINT `fk_drivers_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_driver_truck` FOREIGN KEY (`truck_id`) REFERENCES `trucks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- notifications
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `type` enum('COLLECTION_REMINDER','TRUCK_IS_NEAR','COLLECTION_DONE','REPORT_UPDATE','NEW_POST','ANNOUNCEMENT','MISSED_COLLECTION','SYSTEM') NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `ref_id` varchar(36) DEFAULT NULL,
  `ref_module` varchar(50) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`user_id`),
  KEY `idx_notifications_user_lookup` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `fk_notifications_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- posts
CREATE TABLE `posts` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` longtext NOT NULL,
  `category` enum('WASTE_TIP','EVENT') NOT NULL,
  `status` enum('DRAFT','PUBLISHED','SCHEDULED','ARCHIVED') DEFAULT 'DRAFT',
  `is_featured` tinyint(1) DEFAULT '0',
  `view_count` int DEFAULT '0',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`created_by`),
  CONSTRAINT `fk_posts_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- reports
CREATE TABLE `reports` (
  `id` varchar(36) NOT NULL,
  `reference_number` varchar(20) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `barangay_id` varchar(36) NOT NULL,
  `violation_type` enum('ILLEGAL_DUMPING','MISSED_COLLECTION','OVERFLOWING_BIN','OPEN_BURNING','LITTERING','IMPROPER_SEGREGATION','OTHER') NOT NULL,
  `landmark` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `status` enum('SUBMITTED','UNDER_REVIEW','DISPATCHED','RESOLVED') DEFAULT 'SUBMITTED',
  `admin_response` text DEFAULT NULL,
  `is_false` tinyint(1) DEFAULT '0',
  `is_duplicate` tinyint(1) DEFAULT '0',
  `duplicate_of_id` varchar(36) DEFAULT NULL,
  `duplicate_reason` text DEFAULT NULL,
  `false_reason` text DEFAULT NULL,
  `duplicate_flagged_by` varchar(36) DEFAULT NULL,
  `false_flagged_by` varchar(36) DEFAULT NULL,
  `duplicate_flagged_at` datetime DEFAULT NULL,
  `false_flagged_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pin_lat` decimal(10,8) DEFAULT NULL,
  `pin_lng` decimal(11,8) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `resident_hidden_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_number` (`reference_number`),
  KEY `fk_1` (`user_id`),
  KEY `fk_2` (`barangay_id`),
  KEY `idx_reports_deleted` (`deleted_at`),
  CONSTRAINT `fk_reports_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_2` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- routes
CREATE TABLE `routes` (
  `id` varchar(36) NOT NULL,
  `truck_id` varchar(36) NOT NULL,
  `driver_id` varchar(36) DEFAULT NULL,
  `day_of_week` enum('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  `start_time` varchar(10) NOT NULL,
  `status` enum('ACTIVE','PAUSED','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(100) DEFAULT NULL,
  `waste_type` enum('Biodegradable','Non-Biodegradable') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_routes_truck_day` (`truck_id`,`day_of_week`),
  KEY `fk_1` (`truck_id`),
  KEY `fk_2` (`driver_id`),
  CONSTRAINT `fk_routes_1` FOREIGN KEY (`truck_id`) REFERENCES `trucks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_routes_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- route_collection_reminder_log
CREATE TABLE `route_collection_reminder_log` (
  `id` varchar(36) NOT NULL,
  `route_id` varchar(36) NOT NULL,
  `collection_date` date NOT NULL,
  `reminder_timing` int NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_route_collection_reminder` (`route_id`,`collection_date`,`reminder_timing`),
  CONSTRAINT `fk_route_collection_reminder_route` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- route_runs
CREATE TABLE `route_runs` (
  `id` varchar(36) NOT NULL,
  `route_id` varchar(36) DEFAULT NULL,
  `run_date` date NOT NULL,
  `truck_id` varchar(36) NOT NULL,
  `driver_id` varchar(36) DEFAULT NULL,
  `route_name` varchar(100) DEFAULT NULL,
  `truck_name_snapshot` varchar(255) DEFAULT NULL,
  `truck_plate_snapshot` varchar(255) DEFAULT NULL,
  `waste_type` enum('Biodegradable','Non-Biodegradable') DEFAULT NULL,
  `scheduled_start_time` varchar(10) NOT NULL,
  `status` enum('SCHEDULED','ACTIVE','PAUSED','COMPLETED','PARTIAL','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `collection_started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `paused_at` datetime(3) DEFAULT NULL,
  `total_paused_seconds` int NOT NULL DEFAULT 0,
  `gps_expected_since` datetime(3) DEFAULT NULL,
  `gps_alert_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_route_runs_template_date` (`route_id`,`run_date`),
  KEY `idx_route_runs_date_status` (`run_date`,`status`),
  KEY `idx_route_runs_driver_date` (`driver_id`,`run_date`),
  KEY `idx_route_runs_truck_date` (`truck_id`,`run_date`),
  CONSTRAINT `fk_route_runs_template` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_route_runs_truck_restrict` FOREIGN KEY (`truck_id`) REFERENCES `trucks` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_route_runs_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- route_run_stops
CREATE TABLE `route_run_stops` (
  `id` varchar(36) NOT NULL,
  `route_run_id` varchar(36) NOT NULL,
  `template_stop_id` varchar(36) DEFAULT NULL,
  `barangay_id` varchar(36) NOT NULL,
  `street_id` varchar(36) DEFAULT NULL,
  `stop_name` varchar(180) DEFAULT NULL,
  `coverage_path` json DEFAULT NULL,
  `stop_order` int NOT NULL,
  `status` enum('NOT_STARTED','IN_PROGRESS','DONE','MISSED') NOT NULL DEFAULT 'NOT_STARTED',
  `completed_at` datetime DEFAULT NULL,
  `notified_at` datetime DEFAULT NULL,
  `target_notified_at` datetime DEFAULT NULL,
  `collection_done_notified_at` datetime DEFAULT NULL,
  `collection_skipped_notified_at` datetime DEFAULT NULL,
  `skipped_reason` varchar(255) DEFAULT NULL,
  `distance_km` decimal(8,2) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_route_run_stops_run_order` (`route_run_id`,`stop_order`),
  KEY `idx_route_run_stops_street` (`street_id`),
  CONSTRAINT `fk_route_run_stops_run` FOREIGN KEY (`route_run_id`) REFERENCES `route_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_run_stops_street` FOREIGN KEY (`street_id`) REFERENCES `barangay_streets` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- route_run_proximity_receipts
CREATE TABLE `route_run_proximity_receipts` (
  `route_run_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`route_run_id`,`user_id`),
  KEY `idx_proximity_receipt_user` (`user_id`),
  CONSTRAINT `fk_proximity_receipt_run` FOREIGN KEY (`route_run_id`) REFERENCES `route_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proximity_receipt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- schedules
CREATE TABLE `schedules` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `event_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `event_type` enum('PRIVATE_EVENT','COMMUNITY_EVENT','COLLECTION_SCHEDULE') NOT NULL DEFAULT 'PRIVATE_EVENT',
  `visibility` enum('PRIVATE','PUBLIC','SHARED') NOT NULL DEFAULT 'PRIVATE',
  `location` varchar(255) DEFAULT NULL,
  `barangay_id` varchar(36) DEFAULT NULL,
  `status` enum('UPCOMING','ONGOING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  `created_by` varchar(36) NOT NULL,
  `announcement_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_date_visibility` (`event_date`,`visibility`,`deleted_at`),
  KEY `idx_schedules_event_type` (`event_type`),
  KEY `idx_schedules_barangay` (`barangay_id`),
  KEY `idx_schedules_status` (`status`),
  KEY `fk_schedules_created_by` (`created_by`),
  UNIQUE KEY `uq_schedules_announcement` (`announcement_id`),
  KEY `idx_schedules_announcement` (`announcement_id`),
  CONSTRAINT `fk_schedules_barangay` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_schedules_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_schedules_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- sessions
CREATE TABLE `sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(500) NOT NULL,
  `device` varchar(500) DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `fk_1` (`user_id`),
  CONSTRAINT `fk_sessions_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- mobile_push_devices
CREATE TABLE `mobile_push_devices` (
  `token` varchar(255) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `session_id` varchar(36) NOT NULL,
  `platform` enum('android','ios') NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `registration_version` varchar(36) DEFAULT NULL,
  `last_error` varchar(40) DEFAULT NULL,
  `native_token_hash` char(64) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `push_user` (`user_id`),
  KEY `push_session` (`session_id`),
  CONSTRAINT `fk_push_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_push_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- tracking_logs
CREATE TABLE `tracking_logs` (
  `id` varchar(36) NOT NULL,
  `truck_id` varchar(36) NOT NULL,
  `driver_id` varchar(36) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `route_run_id` varchar(36) DEFAULT NULL,
  `sample_id` varchar(36) DEFAULT NULL,
  `captured_at` datetime(3) DEFAULT NULL,
  UNIQUE KEY `uq_tracking_sample` (`sample_id`),
  KEY `idx_tracking_capture` (`truck_id`,`captured_at`,`id`),
  PRIMARY KEY (`id`),
  KEY `fk_1` (`truck_id`),
  KEY `idx_tracking_logs_truck_latest` (`truck_id`,`created_at`,`id`),
  KEY `fk_2` (`driver_id`),
  CONSTRAINT `fk_tracking_logs_truck_restrict` FOREIGN KEY (`truck_id`) REFERENCES `trucks` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tracking_logs_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- user_settings
CREATE TABLE `user_settings` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `notif_collection_reminders` tinyint(1) DEFAULT '1',
  `notif_truck_near` tinyint(1) DEFAULT '1',
  `notif_collection_done` tinyint(1) DEFAULT '1',
  `notif_collection_skipped` tinyint(1) DEFAULT '1',
  `notif_report_updates` tinyint(1) DEFAULT '1',
  `notif_new_content` tinyint(1) DEFAULT '1',
  `notif_announcements` tinyint(1) DEFAULT '1',
  `notif_admin_reports` tinyint(1) NOT NULL DEFAULT '1',
  `notif_admin_route_issues` tinyint(1) NOT NULL DEFAULT '1',
  `notif_admin_driver_messages` tinyint(1) NOT NULL DEFAULT '1',
  `primary_barangay_id` varchar(36) DEFAULT NULL,
  `reminder_on` tinyint(1) DEFAULT '1',
  `reminder_timing` enum('1h','3h','1d') DEFAULT '3h',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_settings` (`user_id`),
  KEY `fk_settings_barangay` (`primary_barangay_id`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_settings_barangay` FOREIGN KEY (`primary_barangay_id`) REFERENCES `barangays` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- announcement_barangays
CREATE TABLE `announcement_barangays` (
  `id` varchar(36) NOT NULL,
  `announcement_id` varchar(36) NOT NULL,
  `barangay_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`announcement_id`),
  KEY `fk_2` (`barangay_id`),
  CONSTRAINT `fk_announcement_barangays_1` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_announcement_barangays_2` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- announcement_read_receipts
CREATE TABLE `announcement_read_receipts` (
  `id` varchar(36) NOT NULL,
  `announcement_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `read_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_receipt` (`announcement_id`,`user_id`),
  PRIMARY KEY (`id`),
  KEY `fk_2` (`user_id`),
  CONSTRAINT `fk_announcement_read_receipts_1` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_announcement_read_receipts_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- driver_messages
CREATE TABLE `driver_messages` (
  `id` varchar(36) NOT NULL,
  `driver_id` varchar(36) NOT NULL,
  `sent_by` varchar(36) NOT NULL,
  `route_id` varchar(64) DEFAULT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`driver_id`),
  KEY `fk_2` (`sent_by`),
  KEY `idx_driver_messages_conversation` (`driver_id`,`created_at`,`id`),
  KEY `idx_driver_messages_unread` (`driver_id`,`is_read`,`sent_by`),
  KEY `idx_driver_messages_driver_route_created` (`driver_id`,`route_id`,`created_at`),
  KEY `fk_driver_messages_route` (`route_id`),
  CONSTRAINT `fk_driver_messages_1` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_driver_messages_2` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_driver_messages_run` FOREIGN KEY (`route_id`) REFERENCES `route_runs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- post_images
CREATE TABLE `post_images` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(36) NOT NULL,
  `url` varchar(500) NOT NULL,
  `stop_order` int DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`post_id`),
  CONSTRAINT `fk_post_images_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- post_likes
CREATE TABLE `post_likes` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  PRIMARY KEY (`id`),
  KEY `fk_2` (`user_id`),
  CONSTRAINT `fk_post_likes_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_likes_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- post_tags
CREATE TABLE `post_tags` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(36) NOT NULL,
  `tag` varchar(50) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`post_id`),
  CONSTRAINT `fk_post_tags_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- post_view_logs
CREATE TABLE `post_view_logs` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `viewed_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_view_tracker` (`post_id`,`user_id`,`ip_address`),
  PRIMARY KEY (`id`),
  KEY `fk_2` (`user_id`),
  CONSTRAINT `fk_post_view_logs_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_view_logs_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- report_notes
CREATE TABLE `report_notes` (
  `id` varchar(36) NOT NULL,
  `report_id` varchar(36) NOT NULL,
  `note` text NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`report_id`),
  KEY `fk_2` (`created_by`),
  CONSTRAINT `fk_report_notes_1` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_notes_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- report_photos
CREATE TABLE `report_photos` (
  `id` varchar(36) NOT NULL,
  `report_id` varchar(36) NOT NULL,
  `url` varchar(500) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`report_id`),
  CONSTRAINT `fk_report_photos_1` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- report_status_history
CREATE TABLE `report_status_history` (
  `id` varchar(36) NOT NULL,
  `report_id` varchar(36) NOT NULL,
  `status` enum('SUBMITTED','UNDER_REVIEW','DISPATCHED','RESOLVED') NOT NULL,
  `changed_by` varchar(36) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_1` (`report_id`),
  KEY `fk_2` (`changed_by`),
  CONSTRAINT `fk_report_status_history_1` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_status_history_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- route_stops
CREATE TABLE `route_stops` (
  `id` varchar(36) NOT NULL,
  `route_id` varchar(36) NOT NULL,
  `barangay_id` varchar(36) NOT NULL,
  `street_id` varchar(36) DEFAULT NULL,
  `stop_order` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `distance_km` decimal(8,2) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_1` (`route_id`),
  KEY `fk_2` (`barangay_id`),
  KEY `idx_route_stops_street` (`street_id`),
  CONSTRAINT `fk_route_stops_1` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_stops_2` FOREIGN KEY (`barangay_id`) REFERENCES `barangays` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_stops_street` FOREIGN KEY (`street_id`) REFERENCES `barangay_streets` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
