export const webHomePath = (role?: string | null) => {
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/collector";
  if (role === "RESIDENT") return "/resident";
  return "/";
};
