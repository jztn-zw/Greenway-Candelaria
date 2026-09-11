-- Failed login attempts can occur before the account is identified.
-- Keep the foreign-key relationship for known actors while allowing a null actor
-- for these security events.
ALTER TABLE audit_logs
  DROP FOREIGN KEY fk_1;

ALTER TABLE audit_logs
  MODIFY COLUMN user_id VARCHAR(36) NULL;

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_1
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
