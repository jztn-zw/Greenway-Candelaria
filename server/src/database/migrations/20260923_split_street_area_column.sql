-- Keep the street name and its Ilaya/Ibaba collection area in separate fields.
ALTER TABLE barangay_streets
  ADD COLUMN area VARCHAR(100) DEFAULT NULL AFTER name;

ALTER TABLE barangay_streets
  ADD KEY idx_barangay_streets_barangay (barangay_id);

ALTER TABLE barangay_streets
  DROP INDEX uq_barangay_street_name;

UPDATE barangay_streets
SET area = CASE
      WHEN name IN (
        'Gonzales St (Ibaba)', 'Argao St (Ibaba)', 'Cabuñag St (Ibaba)',
        'Salazar St (Ibaba)', 'Del Valle St (Ibaba)',
        'Gonzales St (Ilaya)', 'Argao St (Ilaya)', 'Cabuñag St (Ilaya)',
        'Salazar St (Ilaya)', 'Del Valle St-Sabang (Ilaya)'
      ) AND name LIKE '% (Ibaba)' THEN 'IBABA'
      WHEN name IN (
        'Gonzales St (Ilaya)', 'Argao St (Ilaya)', 'Cabuñag St (Ilaya)',
        'Salazar St (Ilaya)', 'Del Valle St-Sabang (Ilaya)'
      ) THEN 'ILAYA'
      ELSE NULL
    END,
    name = CASE
      WHEN name = 'Highway - Jollibee-Quiapo (Ibaba)' THEN 'Highway (Jollibee-Quiapo)'
      WHEN name = 'Highway - Non-stop-Masin (Ilaya)' THEN 'Highway (Non-stop-Masin)'
      WHEN name LIKE '% (Ilaya)' THEN LEFT(name, CHAR_LENGTH(name) - CHAR_LENGTH(' (Ilaya)'))
      WHEN name LIKE '% (Ibaba)' THEN LEFT(name, CHAR_LENGTH(name) - CHAR_LENGTH(' (Ibaba)'))
      ELSE name
    END
WHERE name LIKE '% (Ilaya)' OR name LIKE '% (Ibaba)';

ALTER TABLE barangay_streets
  ADD UNIQUE KEY uq_barangay_street_name_area (barangay_id, name, area);

ALTER TABLE barangay_streets
  DROP KEY idx_barangay_streets_barangay;
