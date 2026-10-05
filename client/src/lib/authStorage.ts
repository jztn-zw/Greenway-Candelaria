import type { StateStorage } from "zustand/middleware";

// A temporary session takes precedence over any legacy remembered session.
export const getAuthStorage = (): Storage =>
  sessionStorage.getItem("token") ? sessionStorage : localStorage;

export const clearAuthStorage = () => {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of ["token", "user", "auth-storage"]) storage.removeItem(key);
  }
};

export const authStateStorage: StateStorage = {
  getItem: (name) => sessionStorage.getItem(name) ?? localStorage.getItem(name),
  setItem: (name, value) => getAuthStorage().setItem(name, value),
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};
