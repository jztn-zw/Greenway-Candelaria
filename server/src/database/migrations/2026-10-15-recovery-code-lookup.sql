-- Review and back up the users table definition before applying.
-- Apply once; skip if INFORMATION_SCHEMA.STATISTICS already contains
-- idx_users_recovery_code_hash on users. This does not change account records.
ALTER TABLE `users`
  ADD INDEX `idx_users_recovery_code_hash` (`recovery_code_hash`);
