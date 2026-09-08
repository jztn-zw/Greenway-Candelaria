-- Retire the unused resident post-bookmark feature.
-- Its saved-bookmark records are intentionally removed with this table.
DROP TABLE IF EXISTS post_bookmarks;
