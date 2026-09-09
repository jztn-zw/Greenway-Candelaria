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
  (error: AxiosError<{ message?: string; errors?: Array<{ field?: string; message?: string }> }>) => {
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
      validationMessage ??
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred.";

    // Developer diagnostics only: no token, request body, or server stack is
    // exposed here. This applies to every module that uses the shared client.
    console.error(`[API ${status ?? "NETWORK"}] ${error.config?.method?.toUpperCase() ?? "REQUEST"} ${error.config?.url ?? "unknown route"} [${requestId}]`, {
      requestId,
      message,
      validation: error.response?.data?.errors?.map(({ field, message: detail }) => ({ field, message: detail })),
    });

    return Promise.reject(new Error(message));
  },
);

export default api;
