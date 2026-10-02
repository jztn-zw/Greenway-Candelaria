-- Post authors remain recorded through created_by; optional source attribution is retired.
-- For existing databases, scripts/apply-post-source-removal.js backs up attribution text first.
ALTER TABLE posts
  DROP COLUMN source;
