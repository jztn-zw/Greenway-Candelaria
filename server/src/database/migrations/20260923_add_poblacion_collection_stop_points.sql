-- A route_stops record identifies only a barangay. This template keeps the
-- individual Poblacion collection points distinct when their street name is
-- shared by the Ilaya and Ibaba truck routes.
CREATE TABLE collection_stop_points (
  id VARCHAR(36) NOT NULL,
  barangay_id VARCHAR(36) NOT NULL,
  assigned_truck_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  area ENUM('ILAYA', 'IBABA') NOT NULL,
  source_stop_number INT NOT NULL,
  stop_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collection_stop_point_source (barangay_id, source_stop_number),
  UNIQUE KEY uq_collection_stop_point_order (barangay_id, assigned_truck_id, stop_order),
  CONSTRAINT fk_collection_stop_points_barangay
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE,
  CONSTRAINT fk_collection_stop_points_truck
    FOREIGN KEY (assigned_truck_id) REFERENCES trucks(id) ON DELETE RESTRICT
);

-- Truck 1 is the Ibaba route; Truck 2 is the Ilaya route, as marked by MENRO.
-- The supplied Highway entries are retained as distinct named locations.
INSERT INTO collection_stop_points
  (id, barangay_id, assigned_truck_id, name, area, source_stop_number, stop_order)
SELECT
  UUID(),
  barangay.id,
  truck.id,
  point.name,
  point.area,
  point.source_stop_number,
  point.stop_order
FROM barangays AS barangay
JOIN (
  SELECT 'Truck 1' AS truck_name, 'Gonzales St' AS name, 'IBABA' AS area, 1 AS source_stop_number, 1 AS stop_order
  UNION ALL SELECT 'Truck 2', 'Gonzales St', 'ILAYA', 2, 1
  UNION ALL SELECT 'Truck 1', 'Argao St', 'IBABA', 3, 2
  UNION ALL SELECT 'Truck 2', 'Argao St', 'ILAYA', 4, 2
  UNION ALL SELECT 'Truck 1', 'Cabuñag St', 'IBABA', 5, 3
  UNION ALL SELECT 'Truck 2', 'Cabuñag St', 'ILAYA', 6, 3
  UNION ALL SELECT 'Truck 1', 'Salazar St', 'IBABA', 7, 4
  UNION ALL SELECT 'Truck 2', 'Salazar St', 'ILAYA', 8, 4
  UNION ALL SELECT 'Truck 1', 'Del Valle St', 'IBABA', 9, 5
  UNION ALL SELECT 'Truck 2', 'Del Valle St-Sabang', 'ILAYA', 10, 5
  UNION ALL SELECT 'Truck 2', 'Ona St', 'ILAYA', 11, 6
  UNION ALL SELECT 'Truck 2', 'De Alday St', 'ILAYA', 12, 7
  UNION ALL SELECT 'Truck 2', 'Martinez St', 'ILAYA', 13, 8
  UNION ALL SELECT 'Truck 2', 'De Gala St', 'ILAYA', 14, 9
  UNION ALL SELECT 'Truck 1', 'Highway - Jollibee-Quiapo', 'IBABA', 15, 6
  UNION ALL SELECT 'Truck 2', 'Highway - Non-stop-Masin', 'ILAYA', 16, 10
  UNION ALL SELECT 'Truck 1', 'Nadres St', 'IBABA', 17, 7
  UNION ALL SELECT 'Truck 1', 'Bustamante St', 'IBABA', 18, 8
  UNION ALL SELECT 'Truck 1', 'Regidor St', 'IBABA', 19, 9
  UNION ALL SELECT 'Truck 2', 'Patio 1', 'ILAYA', 20, 11
  UNION ALL SELECT 'Truck 2', 'Patio 2', 'ILAYA', 21, 12
  UNION ALL SELECT 'Truck 2', 'Cemetery', 'ILAYA', 22, 13
  UNION ALL SELECT 'Truck 2', 'Ramos Street', 'ILAYA', 23, 14
  UNION ALL SELECT 'Truck 1', 'Peter Paul-Riles', 'IBABA', 24, 10
) AS point
JOIN trucks AS truck ON truck.name = point.truck_name
WHERE barangay.name = 'Poblacion';
