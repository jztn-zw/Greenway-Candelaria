-- Collection service is presently available only in Barangay Poblacion.
-- Other barangays retain their normal ACTIVE status for account registration,
-- but explicitly have no collection service or street list yet.
ALTER TABLE barangays
  ADD COLUMN collection_service_available TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE barangay_streets (
  id VARCHAR(36) NOT NULL,
  barangay_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_barangay_street_name (barangay_id, name),
  CONSTRAINT fk_barangay_streets_barangay
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
);

UPDATE barangays
SET collection_service_available = (name = 'Poblacion');

-- Parenthetical route qualifiers (for example, ibaba and ilaya) are intentionally
-- omitted. Repeated street names are stored only once.
INSERT INTO barangay_streets (id, barangay_id, name)
SELECT UUID(), barangay.id, street.name
FROM barangays AS barangay
CROSS JOIN (
  SELECT 'Gonzales St' AS name
  UNION ALL SELECT 'Argao St'
  UNION ALL SELECT 'Cabuñag St'
  UNION ALL SELECT 'Salazar St'
  UNION ALL SELECT 'Del Valle St'
  UNION ALL SELECT 'Del Valle St-Sabang'
  UNION ALL SELECT 'Ona St'
  UNION ALL SELECT 'De Alday St'
  UNION ALL SELECT 'Martinez St'
  UNION ALL SELECT 'De Gala St'
  UNION ALL SELECT 'Highway'
  UNION ALL SELECT 'Nadres St'
  UNION ALL SELECT 'Bustamante St'
  UNION ALL SELECT 'Regidor St'
  UNION ALL SELECT 'Patio'
  UNION ALL SELECT 'Cemetery'
  UNION ALL SELECT 'Ramos Street'
  UNION ALL SELECT 'Peter Paul-Riles'
) AS street
WHERE barangay.name = 'Poblacion';
