-- Messaging services reference performed route runs, not recurring templates.
-- Check existing references before application; do not discard messages.
ALTER TABLE driver_messages DROP FOREIGN KEY fk_driver_messages_route;
ALTER TABLE driver_messages ADD CONSTRAINT fk_driver_messages_run
  FOREIGN KEY (route_id) REFERENCES route_runs(id) ON DELETE SET NULL;

ALTER TABLE driver_messages ADD INDEX idx_driver_messages_conversation (driver_id, created_at, id);
ALTER TABLE driver_messages ADD INDEX idx_driver_messages_unread (driver_id, is_read, sent_by);
