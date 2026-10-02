export const PROFILE_AVATARS = [
  { id: "avatar-1", label: "Woman with long hair on green", src: "/profile-avatars/avatar-1.png" },
  { id: "avatar-2", label: "Woman with short hair on blue", src: "/profile-avatars/avatar-2.png" },
  { id: "avatar-3", label: "Woman with a ponytail on orange", src: "/profile-avatars/avatar-3.png" },
  { id: "avatar-4", label: "Woman with long hair on purple", src: "/profile-avatars/avatar-4.png" },
  { id: "avatar-5", label: "Woman with curly hair on teal", src: "/profile-avatars/avatar-5.png" },
  { id: "avatar-6", label: "Man with short hair on green", src: "/profile-avatars/avatar-6.png" },
  { id: "avatar-7", label: "Man with styled hair on blue", src: "/profile-avatars/avatar-7.png" },
  { id: "avatar-8", label: "Man with curly hair on orange", src: "/profile-avatars/avatar-8.png" },
  { id: "avatar-9", label: "Man with glasses on purple", src: "/profile-avatars/avatar-9.png" },
  { id: "avatar-10", label: "Smiling man on teal", src: "/profile-avatars/avatar-10.png" },
] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATARS)[number]["id"];
export const DEFAULT_PROFILE_AVATAR_ID: ProfileAvatarId = "avatar-1";

export const isProfileAvatarId = (value: string | null): value is ProfileAvatarId =>
  PROFILE_AVATARS.some((avatar) => avatar.id === value);

export const profileAvatarSrc = (avatarId: ProfileAvatarId) =>
  PROFILE_AVATARS.find((avatar) => avatar.id === avatarId)?.src ?? PROFILE_AVATARS[0].src;

export const profileAvatarIdFromUrl = (url: string | null | undefined): ProfileAvatarId | null =>
  PROFILE_AVATARS.find((avatar) => avatar.src === url)?.id ?? null;

export const profileAvatarForAccount = (accountId: string | null | undefined, url: string | null | undefined): ProfileAvatarId => {
  const selected = profileAvatarIdFromUrl(url);
  if (selected) return selected;
  if (!accountId) return DEFAULT_PROFILE_AVATAR_ID;
  const prefix = accountId.replace(/-/g, "").slice(0, 8);
  const index = /^[0-9a-f]{8}$/i.test(prefix)
    ? parseInt(prefix, 16) % PROFILE_AVATARS.length
    : Array.from(accountId).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0) % PROFILE_AVATARS.length;
  return PROFILE_AVATARS[index].id;
};

export const profileAvatarForCurrentUser = (accountId: string | null | undefined, url: string | null | undefined, role: string): ProfileAvatarId => {
  const selected = profileAvatarIdFromUrl(url);
  if (selected) return selected;
  if (accountId) {
    const key = role === "DRIVER" ? "collector" : role.toLowerCase();
    const saved = localStorage.getItem(`greenway:${key}-avatar:${accountId}`);
    if (isProfileAvatarId(saved)) return saved;
  }
  return profileAvatarForAccount(accountId, url);
};
