-- Store MENRO's 24 collection choices directly as resident streets. A street
-- and area are one selectable value, e.g. "Gonzales St (Ilaya)".
INSERT INTO barangay_streets (id, barangay_id, name)
SELECT UUID(), b.id, street.name
FROM barangays b
JOIN (
  SELECT 'Gonzales St (Ibaba)' AS name
  UNION ALL SELECT 'Gonzales St (Ilaya)'
  UNION ALL SELECT 'Argao St (Ibaba)'
  UNION ALL SELECT 'Argao St (Ilaya)'
  UNION ALL SELECT 'Cabuñag St (Ibaba)'
  UNION ALL SELECT 'Cabuñag St (Ilaya)'
  UNION ALL SELECT 'Salazar St (Ibaba)'
  UNION ALL SELECT 'Salazar St (Ilaya)'
  UNION ALL SELECT 'Del Valle St (Ibaba)'
  UNION ALL SELECT 'Del Valle St-Sabang (Ilaya)'
  UNION ALL SELECT 'Ona St (Ilaya)'
  UNION ALL SELECT 'De Alday St (Ilaya)'
  UNION ALL SELECT 'Martinez St (Ilaya)'
  UNION ALL SELECT 'De Gala St (Ilaya)'
  UNION ALL SELECT 'Highway - Jollibee-Quiapo (Ibaba)'
  UNION ALL SELECT 'Highway - Non-stop-Masin (Ilaya)'
  UNION ALL SELECT 'Nadres St (Ibaba)'
  UNION ALL SELECT 'Bustamante St (Ibaba)'
  UNION ALL SELECT 'Regidor St (Ibaba)'
  UNION ALL SELECT 'Patio 1 (Ilaya)'
  UNION ALL SELECT 'Patio 2 (Ilaya)'
  UNION ALL SELECT 'Cemetery (Ilaya)'
  UNION ALL SELECT 'Ramos Street (Ilaya)'
  UNION ALL SELECT 'Peter Paul-Riles (Ibaba)'
) street
WHERE b.name = 'Poblacion';

-- De Gala has only one MENRO area, so its existing resident selection can be
-- preserved exactly before the generic Poblacion street rows are removed.
UPDATE users u
JOIN barangay_streets current_street ON current_street.id = u.street_id
JOIN barangays b ON b.id = u.barangay_id
JOIN barangay_streets replacement_street
  ON replacement_street.barangay_id = b.id
 AND replacement_street.name = 'De Gala St (Ilaya)'
SET u.street_id = replacement_street.id
WHERE b.name = 'Poblacion' AND current_street.name = 'De Gala St';

DELETE bs
FROM barangay_streets bs
JOIN barangays b ON b.id = bs.barangay_id
WHERE b.name = 'Poblacion'
  AND bs.name NOT IN (
    'Gonzales St (Ibaba)', 'Gonzales St (Ilaya)',
    'Argao St (Ibaba)', 'Argao St (Ilaya)',
    'Cabuñag St (Ibaba)', 'Cabuñag St (Ilaya)',
    'Salazar St (Ibaba)', 'Salazar St (Ilaya)',
    'Del Valle St (Ibaba)', 'Del Valle St-Sabang (Ilaya)',
    'Ona St (Ilaya)', 'De Alday St (Ilaya)', 'Martinez St (Ilaya)',
    'De Gala St (Ilaya)', 'Highway - Jollibee-Quiapo (Ibaba)',
    'Highway - Non-stop-Masin (Ilaya)', 'Nadres St (Ibaba)',
    'Bustamante St (Ibaba)', 'Regidor St (Ibaba)', 'Patio 1 (Ilaya)',
    'Patio 2 (Ilaya)', 'Cemetery (Ilaya)', 'Ramos Street (Ilaya)',
    'Peter Paul-Riles (Ibaba)'
  );

ALTER TABLE route_stops DROP FOREIGN KEY fk_route_stops_collection_stop_point;
ALTER TABLE route_stops DROP KEY idx_route_stops_collection_stop_point;
ALTER TABLE route_stops DROP COLUMN collection_stop_point_id;
ALTER TABLE route_stops ADD COLUMN street_id VARCHAR(36) NULL AFTER barangay_id;
ALTER TABLE route_stops ADD KEY idx_route_stops_street (street_id);
ALTER TABLE route_stops ADD CONSTRAINT fk_route_stops_street FOREIGN KEY (street_id) REFERENCES barangay_streets(id) ON DELETE RESTRICT;

ALTER TABLE route_run_stops DROP FOREIGN KEY fk_route_run_stops_collection_stop_point;
ALTER TABLE route_run_stops DROP KEY idx_route_run_stops_collection_stop_point;
ALTER TABLE route_run_stops DROP COLUMN collection_stop_point_id;
ALTER TABLE route_run_stops ADD COLUMN street_id VARCHAR(36) NULL AFTER barangay_id;
ALTER TABLE route_run_stops ADD KEY idx_route_run_stops_street (street_id);
ALTER TABLE route_run_stops ADD CONSTRAINT fk_route_run_stops_street FOREIGN KEY (street_id) REFERENCES barangay_streets(id) ON DELETE RESTRICT;

DROP TABLE collection_stop_points;
