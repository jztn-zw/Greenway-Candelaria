-- Back up route_runs and stop API/worker writers before applying.
-- Existing history and GPS fixes are preserved. The first accepted fix claims
-- each run; another session can claim after the owner expires/signs out or its
-- last accepted upload is at least two minutes old.
ALTER TABLE route_runs ADD COLUMN gps_session_id VARCHAR(36) DEFAULT NULL;
