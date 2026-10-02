const test = require("node:test");
const assert = require("node:assert/strict");
const { avatarUrlForAccount } = require("./profileAvatar");

test("new accounts receive the same stable avatar as the client fallback", () => {
  const id = "12345678-0000-4000-8000-000000000000";
  assert.equal(avatarUrlForAccount(id), "/profile-avatars/avatar-7.png");
  assert.equal(avatarUrlForAccount(id), avatarUrlForAccount(id));
});
