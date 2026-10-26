import { create } from "zustand";
import { createJSONStorage,persist } from "zustand/middleware";
import authService,{ User,type AuthResponse } from "../services/authService";
import { authStateStorage,clearAuthStorage,getAuthStorage,saveBrowserAuthSession,adoptBrowserAuthSnapshot,getBrowserSessionMarker,signOutCurrentTab,beginBrowserSignIn,finishBrowserSignIn,isBrowserSignInPending,type BrowserAuthSnapshot } from "@/lib/authStorage";
import { configureWebApiSession } from "@/lib/api";
import { SESSION_REPLACED_NOTICE } from "@/lib/sessionReplaced";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSigningIn: boolean;
  hasHydrated: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  ensureSession: (force?: boolean) => Promise<boolean>;
  setUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
  clearAuth: () => void;
  syncBrowserSession: (markerId: string, snapshot: BrowserAuthSnapshot | null) => boolean;
}

const SESSION_VERIFY_TTL_MS = 60_000;
let lastSessionVerifiedAt = 0;
let authGeneration = 0;
let latestSignInAttempt = 0;
let inFlightSessionCheck: { generation: number; token: string; promise: Promise<boolean> } | null = null;

const authenticate = async (request: () => Promise<AuthResponse>, rememberMe: boolean): Promise<AuthResponse> => {
  const attempt = ++latestSignInAttempt;
  const browserSignIn = beginBrowserSignIn();
  const generation = ++authGeneration;
  inFlightSessionCheck = null;
  useAuthStore.setState({ isLoading: true, isSigningIn: true });
  try {
    const result = await request();
    if (generation !== authGeneration) throw new Error("Your session changed");
    if ("token" in result) {
      localStorage.removeItem(SESSION_REPLACED_NOTICE);
      sessionStorage.removeItem(SESSION_REPLACED_NOTICE);
      saveBrowserAuthSession(result.token, result.user, rememberMe);
      useAuthStore.setState({ user: result.user, token: result.token, isAuthenticated: true });
      lastSessionVerifiedAt = performance.now();
    }
    return result;
  } finally {
    finishBrowserSignIn(browserSignIn);
    if (attempt === latestSignInAttempt) useAuthStore.setState({ isLoading: false, isSigningIn: false });
  }
};

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isSigningIn: false,
      hasHydrated: false,

      login: async (identifier, password, rememberMe = true) => {
        return authenticate(() => authService.login({ identifier: identifier.trim(), password, login_mode: "username" }), rememberMe);
      },

      logout: async () => {
        authGeneration++;
        inFlightSessionCheck = null;
        lastSessionVerifiedAt = 0;
        signOutCurrentTab();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, isSigningIn: false });
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
          lastSessionVerifiedAt > 0 &&
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
          .catch((error) => {
            if (!isCurrent()) return false;
            if (error?.response?.data?.code === "SESSION_REPLACED" && isBrowserSignInPending()) {
              set({ isLoading: false });
              return !!get().user && get().isAuthenticated;
            }
            if (error?.response?.status === 401 || error?.response?.status === 403) {
              get().clearAuth();
              return false;
            }
            // A network outage cannot invalidate an otherwise cached login.
            set({ isLoading: false });
            return !!get().user && get().isAuthenticated;
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

      syncBrowserSession: (markerId, snapshot) => {
        const marker = getBrowserSessionMarker();
        if (marker?.id !== markerId || (marker.active && !snapshot)) return false;
        if (snapshot && !adoptBrowserAuthSnapshot(snapshot)) return false;
        if (snapshot) {
          localStorage.removeItem(SESSION_REPLACED_NOTICE);
          sessionStorage.removeItem(SESSION_REPLACED_NOTICE);
        }
        if (!snapshot) clearAuthStorage();
        authGeneration++;
        inFlightSessionCheck = null;
        lastSessionVerifiedAt = 0;
        set({ user: snapshot?.user ?? null, token: snapshot?.token ?? null, isAuthenticated: !!snapshot, isLoading: false, isSigningIn: false, hasHydrated: true });
        return true;
      },

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
          isSigningIn: false,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: state => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      storage: createJSONStorage(() => authStateStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export default useAuthStore;

configureWebApiSession(() => useAuthStore.getState().token, () => useAuthStore.getState().isSigningIn);
