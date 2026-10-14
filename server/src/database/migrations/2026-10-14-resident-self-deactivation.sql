-- Review and back up the users table definition before applying to an existing database.
-- Existing accounts keep NULL, including older admin-deactivated accounts.
-- Apply once; skip if INFORMATION_SCHEMA.COLUMNS already contains this column.
ALTER TABLE `users`
  ADD COLUMN `self_deactivated_at` datetime(3) DEFAULT NULL AFTER `status`;
