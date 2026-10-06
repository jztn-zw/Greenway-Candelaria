import { create } from "zustand";
import { createJSONStorage,persist } from "zustand/middleware";
import authService,{ User,type AuthResponse } from "../services/authService";
import { authStateStorage,clearAuthStorage,getAuthStorage } from "@/lib/authStorage";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  ensureSession: (force?: boolean) => Promise<boolean>;
  setUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
  clearAuth: () => void;
}

const SESSION_VERIFY_TTL_MS = 60_000;
let lastSessionVerifiedAt = 0;
let authGeneration = 0;
let inFlightSessionCheck: { generation: number; token: string; promise: Promise<boolean> } | null = null;

const authenticate = async (request: () => Promise<AuthResponse>, rememberMe: boolean): Promise<AuthResponse> => {
  const generation = ++authGeneration;
  inFlightSessionCheck = null;
  useAuthStore.setState({ isLoading: true });
  try {
    const result = await request();
    if (generation !== authGeneration) throw new Error("Your session changed");
    if ("token" in result) {
      clearAuthStorage();
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", result.token);
      storage.setItem("user", JSON.stringify(result.user));
      useAuthStore.setState({ user: result.user, token: result.token, isAuthenticated: true });
      lastSessionVerifiedAt = performance.now();
    }
    return result;
  } finally {
    if (generation === authGeneration) useAuthStore.setState({ isLoading: false });
  }
};

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      login: async (identifier, password, rememberMe = true) => {
        await authenticate(() => authService.login({ identifier, password }), rememberMe);
      },

      logout: async () => {
        // Start revocation with the current token, then end local ownership
        // immediately. A slow response cannot clear a subsequent login.
        const revocation = authService.logout();
        get().clearAuth();
        await revocation;
      },

      ensureSession: async (force = false) => {
        const token = authService.getToken();
        const currentUser = get().user ?? authService.getCurrentUser();
        const now = performance.now();

        if (!token) {
          get().clearAuth();
          return false;
        }

        if (
          !force &&
          currentUser &&
          get().isAuthenticated &&
          now - lastSessionVerifiedAt < SESSION_VERIFY_TTL_MS
        ) {
          return true;
        }

        const generation = authGeneration;
        const isCurrent = () => generation === authGeneration && authService.getToken() === token;
        if (inFlightSessionCheck?.generation === generation && inFlightSessionCheck.token === token) {
          return inFlightSessionCheck.promise;
        }

        set({ isLoading: true });

        const promise = authService
          .getMe()
          .then((user) => {
            if (!isCurrent()) return false;
            getAuthStorage().setItem("user", JSON.stringify(user));
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            lastSessionVerifiedAt = performance.now();
            return true;
          })
          .catch(() => {
            if (isCurrent()) get().clearAuth();
            return false;
          })
          .finally(() => {
            if (inFlightSessionCheck?.promise === promise) inFlightSessionCheck = null;
          });
        inFlightSessionCheck = { generation, token, promise };
        return promise;
      },

      setUser: (user) => {
        // A server-confirmed profile write supersedes older session snapshots.
        authGeneration++;
        inFlightSessionCheck = null;
        getAuthStorage().setItem("user", JSON.stringify(user));
        set({ user, isLoading: false });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),

      clearAuth: () => {
        authGeneration++;
        inFlightSessionCheck = null;
        clearAuthStorage();
        lastSessionVerifiedAt = 0;
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => authStateStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export default useAuthStore;
