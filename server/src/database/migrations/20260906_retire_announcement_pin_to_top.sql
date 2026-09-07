-- The Pin to Top feature has been retired. Keep the existing column for
-- backwards-compatible schema imports, but clear any old pin state.
UPDATE announcements SET is_featured = FALSE WHERE is_featured = TRUE;
