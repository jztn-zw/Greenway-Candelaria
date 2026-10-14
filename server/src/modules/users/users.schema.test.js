const test = require("node:test");
const assert = require("node:assert/strict");
const { updateProfileSchema } = require("./users.schema");
test("contact email is optional, normalized, and can be removed without changing other fields", () => {
  assert.equal(updateProfileSchema.parse({ email: " Resident@Example.test " }).email, "resident@example.test");
  assert.equal(updateProfileSchema.parse({ email: "" }).email, null);
  assert.equal(updateProfileSchema.safeParse({ email: "invalid" }).success, false);
});

test("profile avatar choices are limited to the ten supplied portraits", () => {
  for (let number = 1; number <= 10; number += 1) {
    assert.equal(updateProfileSchema.safeParse({ avatar_url: `/profile-avatars/avatar-${number}.png` }).success, true);
  }
  assert.equal(updateProfileSchema.safeParse({ avatar_url: "/profile-avatars/avatar-11.png" }).success, false);
  assert.equal(updateProfileSchema.safeParse({ avatar_url: "https://example.com/other.png" }).success, false);
});
