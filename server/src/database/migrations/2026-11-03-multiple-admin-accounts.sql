-- Authorized multiple-admin support. Back up users/sessions/settings/audit first.
-- Keep all APIs/workers stopped until the compatible API is restarted.
ALTER TABLE users DROP INDEX uq_users_single_active_admin;
ALTER TABLE users DROP COLUMN single_active_admin;
-- Shared email/phone columns stay available to residents and collectors.
-- Admin contact clearing and account provisioning are parameterized transactional
-- operations in scripts/provision-admin-accounts.cjs; credentials are never SQL literals.
