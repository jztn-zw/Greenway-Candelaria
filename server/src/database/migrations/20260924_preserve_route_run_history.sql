-- Preserve completed daily operations when an inactive recurring route template is deleted.
ALTER TABLE route_runs DROP FOREIGN KEY fk_route_runs_template;
ALTER TABLE route_runs MODIFY route_id VARCHAR(36) NULL;
ALTER TABLE route_runs
  ADD CONSTRAINT fk_route_runs_template
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;
