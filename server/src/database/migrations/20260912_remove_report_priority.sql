-- Report priority is no longer part of the report workflow or data model.
ALTER TABLE reports
  DROP COLUMN priority;
