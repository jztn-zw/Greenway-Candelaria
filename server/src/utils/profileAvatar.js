const avatarUrlForAccount = (accountId) => {
  const prefix = String(accountId).replace(/-/g, "").slice(0, 8);
  const index = /^[0-9a-f]{8}$/i.test(prefix)
    ? Number.parseInt(prefix, 16) % 10
    : Array.from(String(accountId)).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0) % 10;
  return `/profile-avatars/avatar-${index + 1}.png`;
};

module.exports = { avatarUrlForAccount };
