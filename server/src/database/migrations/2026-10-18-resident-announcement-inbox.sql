-- Additive migration. Back up and review the users definition before applying.
-- Run the check first; execute ALTER only if the column is absent.
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'announcement_inbox_initialized_at';

ALTER TABLE users
  ADD COLUMN announcement_inbox_initialized_at DATETIME(3) NULL DEFAULT NULL;

-- This migration does not insert notifications. On the resident's next inbox or
-- unread-count read, the API initializes their eligible pre-signup notices once.
