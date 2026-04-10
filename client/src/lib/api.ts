import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request: Attach Token ─────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response: Normalize Errors ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const isAuthRoute =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register");

    const status = error.response?.status;

    // Session expired → clear storage and redirect to login
    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
      return Promise.reject(error);
    }

    // Normalize error message for all other cases
    const message =
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred.";

    return Promise.reject(new Error(message));
  },
);

export default api;
