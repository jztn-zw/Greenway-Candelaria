import { describe, expect, it } from "vitest";
import { profileAvatarForAccount, profileAvatarForCurrentUser, profileAvatarSrc } from "./profileAvatars";

describe("automatic profile avatars", () => {
  it("assigns a stable portrait from the account ID", () => {
    const id = "12345678-0000-4000-8000-000000000000";
    expect(profileAvatarSrc(profileAvatarForAccount(id, null))).toBe("/profile-avatars/avatar-7.png");
    expect(profileAvatarForAccount(id, null)).toBe(profileAvatarForAccount(id, null));
  });

  it("uses the avatar selected by the account owner", () => {
    expect(profileAvatarForAccount("12345678-0000-4000-8000-000000000000", "/profile-avatars/avatar-3.png")).toBe("avatar-3");
  });

  it("keeps an existing local choice visible until the profile syncs it", () => {
    localStorage.setItem("greenway:resident-avatar:resident-1", "avatar-4");
    expect(profileAvatarForCurrentUser("resident-1", null, "RESIDENT")).toBe("avatar-4");
    expect(profileAvatarForCurrentUser("resident-1", "/profile-avatars/avatar-2.png", "RESIDENT")).toBe("avatar-2");
    localStorage.removeItem("greenway:resident-avatar:resident-1");
  });
});
