import axios, { AxiosError } from "axios";

const api = axios.create({
  timeout: 15000,
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
}, undefined, { synchronous: true });

// ─── Response: Normalize Errors ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; requestId?: string; errors?: Array<{ field?: string; message?: string }> }>) => {
    const isAuthRoute =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register");

    const status = error.response?.status;
    const requestId =
      error.response?.headers?.["x-request-id"] ||
      error.response?.data?.requestId ||
      "unavailable";

    // Session expired → clear storage and redirect to login
    if (status === 401 && !isAuthRoute) {
      const currentToken = localStorage.getItem("token");
      const requestToken = error.config?.headers?.Authorization;
      // A revoked request from the previous account must not sign out the
      // account that has since logged in on this browser.
      if (requestToken !== (currentToken ? `Bearer ${currentToken}` : undefined)) {
        return Promise.reject(error);
      }
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
      return Promise.reject(error);
    }

    // Normalize error message for all other cases
    const validationMessage = error.response?.data?.errors
      ?.map((item) => item.message)
      .filter(Boolean)
      .join(" ");
    const message =
      validationMessage ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";

    // Developer diagnostics only: no token, request body, or server stack is
    // exposed here. This applies to every module that uses the shared client.
    console.error(`[API ${status ?? "NETWORK"}] ${error.config?.method?.toUpperCase() ?? "REQUEST"} ${error.config?.url ?? "unknown route"} [${requestId}]`, {
      requestId,
      message,
      validation: error.response?.data?.errors?.map(({ field, message: detail }) => ({ field, message: detail })),
    });

    error.message = message;
    return Promise.reject(error);
  },
);

export default api;
