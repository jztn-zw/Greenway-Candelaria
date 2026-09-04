-- Keep exactly one non-deleted ADMIN account while preserving soft-deleted
-- accounts and every foreign-keyed record attached to them.
-- Run only after confirming that the database has no more than one active admin.
ALTER TABLE `users`
  ADD COLUMN `single_active_admin` TINYINT
    GENERATED ALWAYS AS (IF(`role` = 'ADMIN' AND `deleted_at` IS NULL, 1, NULL)) VIRTUAL;

ALTER TABLE `users`
  ADD UNIQUE KEY `uq_users_single_active_admin` (`single_active_admin`);
