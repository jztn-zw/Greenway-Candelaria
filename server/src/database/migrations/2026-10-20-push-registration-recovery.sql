-- Additive only. Back up mobile_push_devices and obtain approval before applying.
-- Apply before deploying the matching API. Existing clients remain compatible.
ALTER TABLE mobile_push_devices
  ADD COLUMN registration_version varchar(36) DEFAULT NULL,
  ADD COLUMN last_error varchar(40) DEFAULT NULL,
  ADD COLUMN native_token_hash char(64) DEFAULT NULL;
