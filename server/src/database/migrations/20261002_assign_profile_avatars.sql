-- Give existing accounts a stable portrait from the ten built-in choices.
-- A previously selected built-in avatar is preserved.
UPDATE users
SET avatar_url = CONCAT(
  '/profile-avatars/avatar-',
  MOD(CAST(CONV(LEFT(REPLACE(id, '-', ''), 8), 16, 10) AS UNSIGNED), 10) + 1,
  '.png'
)
WHERE avatar_url IS NULL OR avatar_url = '';
