ALTER TABLE users
  ADD COLUMN street_id VARCHAR(36) NULL AFTER barangay_id;

ALTER TABLE users
  ADD KEY fk_user_street (street_id);

ALTER TABLE users
  ADD CONSTRAINT fk_user_street
    FOREIGN KEY (street_id) REFERENCES barangay_streets(id) ON DELETE SET NULL;
