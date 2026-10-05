import { beforeEach, expect, it, vi } from "vitest";
import authService, { type User } from "@/services/authService";
import useAuthStore from "./authStore";

vi.mock("@/services/authService", () => ({ default: {
  login: vi.fn(), logout: vi.fn(), getMe: vi.fn(),
  getToken: () => localStorage.getItem("token"), getCurrentUser: () => null,
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
beforeEach(() => { vi.clearAllMocks(); useAuthStore.getState().clearAuth(); vi.mocked(authService.logout).mockResolvedValue(undefined); });

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
