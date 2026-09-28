-- Allow admins to use any short area label instead of an Ilaya/Ibaba enum.
ALTER TABLE barangay_streets
  MODIFY COLUMN area VARCHAR(100) DEFAULT NULL;

-- Preserve the existing human-friendly presentation for imported labels.
UPDATE barangay_streets
SET area = CASE
  WHEN UPPER(area) = 'ILAYA' THEN 'Ilaya'
  WHEN UPPER(area) = 'IBABA' THEN 'Ibaba'
  ELSE area
END
WHERE area IS NOT NULL;
