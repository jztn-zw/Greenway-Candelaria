import { create } from "zustand";
import { persist } from "zustand/middleware";
import authService, { User } from "../services/authService";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  ensureSession: (force?: boolean) => Promise<boolean>;
  setUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
  clearAuth: () => void;
}

const clearPersistedAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("auth-storage");
};

const SESSION_VERIFY_TTL_MS = 60_000;
let lastSessionVerifiedAt = 0;
let inFlightSessionCheck: Promise<boolean> | null = null;

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const { token, user } = await authService.login({
            identifier,
            password,
          });
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          lastSessionVerifiedAt = Date.now();
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          clearPersistedAuth();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      ensureSession: async (force = false) => {
        const token = authService.getToken();
        const currentUser = get().user ?? authService.getCurrentUser();
        const now = Date.now();

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

        if (inFlightSessionCheck) {
          return inFlightSessionCheck;
        }

        set({ isLoading: true });

        inFlightSessionCheck = authService
          .getMe()
          .then((user) => {
            localStorage.setItem("user", JSON.stringify(user));
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            lastSessionVerifiedAt = Date.now();
            return true;
          })
          .catch(() => {
            get().clearAuth();
            return false;
          })
          .finally(() => {
            inFlightSessionCheck = null;
          });

        return inFlightSessionCheck;
      },

      setUser: (user) => set({ user }),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      clearAuth: () => {
        clearPersistedAuth();
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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export default useAuthStore;
