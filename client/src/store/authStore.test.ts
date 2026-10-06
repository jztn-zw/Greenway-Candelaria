import { beforeEach, expect, it, vi } from "vitest";
import authService, { type User } from "@/services/authService";
import useAuthStore from "./authStore";

vi.mock("@/services/authService", () => ({ default: {
  login: vi.fn(), logout: vi.fn(), getMe: vi.fn(),
  getToken: () => sessionStorage.getItem("token") ?? localStorage.getItem("token"), getCurrentUser: () => null,
} }));
const user = (id: string): User => ({ id, full_name: id, username: id, email: `${id}@example.test`, role: "RESIDENT", status: "ACTIVE", avatar_url: null, barangay_id: null });
const deferred = <T,>() => {
  let resolve!: (value: T) => void; let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const signIn = async (id: string) => {
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user(id), token: `session-${id}` });
  await useAuthStore.getState().login(id, "password");
};
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); useAuthStore.getState().clearAuth(); vi.mocked(authService.logout).mockResolvedValue(undefined); });

it.each([true, false])("stores login only in the selected storage when remember me is %s", async (rememberMe) => {
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user("a"), token: "session-a" });
  await useAuthStore.getState().login("a", "password", rememberMe);
  const selected = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  expect(selected.getItem("token")).toBe("session-a");
  expect(JSON.parse(selected.getItem("user")!).id).toBe("a");
  expect(JSON.parse(selected.getItem("auth-storage")!).state.token).toBe("session-a");
  expect(other.getItem("token")).toBeNull();
  expect(other.getItem("user")).toBeNull();
  expect(other.getItem("auth-storage")).toBeNull();
});

it("a failed password login does not authenticate or store a session", async () => {
  vi.mocked(authService.login).mockRejectedValueOnce(new Error("Invalid credentials"));
  await expect(useAuthStore.getState().login("resident", "password", false)).rejects.toThrow("Invalid credentials");
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(sessionStorage.getItem("token")).toBeNull();
});

it("a late password-login response cannot revive a logged-out session", async () => {
  const pending = deferred<{ user: User; token: string }>();
  vi.mocked(authService.login).mockReturnValueOnce(pending.promise);
  const signingIn = useAuthStore.getState().login("resident", "password", true);
  useAuthStore.getState().clearAuth();
  pending.resolve({ user: user("resident"), token: "late-session" });
  await expect(signingIn).rejects.toThrow("Your session changed");
  expect(localStorage.getItem("token")).toBeNull();
});

it("keeps temporary sessions temporary through verification and profile updates", async () => {
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user("a"), token: "session-a" });
  await useAuthStore.getState().login("a", "password", false);
  vi.mocked(authService.getMe).mockResolvedValueOnce(user("a"));
  expect(await useAuthStore.getState().ensureSession(true)).toBe(true);
  useAuthStore.getState().setUser({ ...user("a"), full_name: "Updated resident" });
  expect(JSON.parse(sessionStorage.getItem("user")!).full_name).toBe("Updated resident");
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
  await useAuthStore.getState().logout();
  expect(sessionStorage.getItem("token")).toBeNull();
  expect(sessionStorage.getItem("user")).toBeNull();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it("removes the remembered account when switching to a temporary session", async () => {
  await signIn("a");
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user("b"), token: "session-b" });
  await useAuthStore.getState().login("b", "password", false);
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
  expect(localStorage.getItem("auth-storage")).toBeNull();
  expect(sessionStorage.getItem("token")).toBe("session-b");
});

it.each([true, false])("restores the selected session after a page reload (%s)", async (rememberMe) => {
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user("a"), token: "session-a" });
  await useAuthStore.getState().login("a", "password", rememberMe);
  vi.resetModules();
  const { default: reloaded } = await import("./authStore");
  expect(reloaded.getState().hasHydrated).toBe(true);
  expect(reloaded.getState().user?.id).toBe("a");
  expect(reloaded.getState().token).toBe("session-a");
  expect(reloaded.getState().isAuthenticated).toBe(true);
});

it("does not restore a temporary session once tab storage is gone", async () => {
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user("a"), token: "session-a" });
  await useAuthStore.getState().login("a", "password", false);
  sessionStorage.clear();
  vi.resetModules();
  const { default: reloaded } = await import("./authStore");
  expect(reloaded.getState().token).toBeNull();
  expect(reloaded.getState().isAuthenticated).toBe(false);
});

it.each(["success", "failure"])("ignores a previous account's late session %s", async (result) => {
  await signIn("a");
  const old = deferred<User>(); vi.mocked(authService.getMe).mockReturnValueOnce(old.promise);
  const checking = useAuthStore.getState().ensureSession(true);
  await useAuthStore.getState().logout(); await signIn("b");
  if (result === "success") old.resolve(user("a")); else old.reject(new Error("Expired"));
  await checking;
  expect(useAuthStore.getState().user?.id).toBe("b");
  expect(useAuthStore.getState().token).toBe("session-b");
  expect(localStorage.getItem("token")).toBe("session-b");
});
it("does not revive a logged-out session", async () => {
  await signIn("a"); const old = deferred<User>(); vi.mocked(authService.getMe).mockReturnValueOnce(old.promise);
  const checking = useAuthStore.getState().ensureSession(true);
  await useAuthStore.getState().logout(); old.resolve(user("a")); await checking;
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(localStorage.getItem("user")).toBeNull();
});
it("starts a fresh account check while the old one is pending", async () => {
  await signIn("a"); const old = deferred<User>(); vi.mocked(authService.getMe).mockReturnValueOnce(old.promise);
  const checking = useAuthStore.getState().ensureSession(true);
  await useAuthStore.getState().logout(); await signIn("b");
  vi.mocked(authService.getMe).mockResolvedValueOnce(user("b"));
  expect(await useAuthStore.getState().ensureSession(true)).toBe(true);
  expect(authService.getMe).toHaveBeenCalledTimes(2);
  old.resolve(user("a")); await checking;
  expect(useAuthStore.getState().user?.id).toBe("b");
});
it("a delayed logout cannot clear a newer login", async () => {
  await signIn("a"); const old = deferred<void>(); vi.mocked(authService.logout).mockReturnValueOnce(old.promise);
  const loggingOut = useAuthStore.getState().logout(); await signIn("b"); old.resolve(); await loggingOut;
  expect(useAuthStore.getState().user?.id).toBe("b"); expect(localStorage.getItem("token")).toBe("session-b");
});
it("rejects a login response after logout", async () => {
  const old = deferred<{ user: User; token: string }>(); vi.mocked(authService.login).mockReturnValueOnce(old.promise);
  const loggingIn = useAuthStore.getState().login("a", "password");
  await useAuthStore.getState().logout(); old.resolve({ user: user("a"), token: "session-a" });
  await expect(loggingIn).rejects.toThrow("session changed");
  expect(useAuthStore.getState().isAuthenticated).toBe(false); expect(localStorage.getItem("token")).toBeNull();
});
it("a late session check cannot undo saved resident setup", async () => {
  await signIn("a");
  const old = deferred<User>();
  vi.mocked(authService.getMe).mockReturnValueOnce(old.promise);
  const checking = useAuthStore.getState().ensureSession(true);
  useAuthStore.getState().setUser({ ...user("a"), profile_completed: true });
  old.resolve({ ...user("a"), profile_completed: false });
  await checking;
  expect(useAuthStore.getState().user?.profile_completed).toBe(true);
});
