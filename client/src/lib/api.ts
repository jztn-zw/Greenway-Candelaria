import axios,{ AxiosError } from "axios";
import { clearAuthStorage,getAuthStorage,isBrowserSignInPending } from "./authStorage";
import { getRetryAfterSeconds } from "./rateLimit";
import { getActionErrorMessage, safeFeedbackMessage } from "./feedbackMessages";
import { endReplacedSession } from "./sessionReplaced";

let readSessionToken: (() => string | null) | undefined;
let signingIn: (() => boolean) | undefined;
export function configureWebApiSession(read: () => string | null, readSigningIn?: () => boolean) { readSessionToken = read; signingIn = readSigningIn; }

const api = axios.create({
  timeout: 15000,
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request: Attach Token ─────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAuthStorage().getItem("token");
  if (readSessionToken && readSessionToken() !== token) throw new axios.CanceledError("Browser account changed before request dispatch");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, undefined, { synchronous: true });

// ─── Response: Normalize Errors ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string; requestId?: string; retryAfterSeconds?: number; errors?: Array<{ field?: string; message?: string }> }>) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const isAuthRoute =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/recover") ||
      error.config?.url?.includes("/auth/register");

    const status = error.response?.status;
    const requestId =
      error.response?.headers?.["x-request-id"] ||
      error.response?.data?.requestId ||
      "unavailable";

    if (status === 429) {
      const retryAfterSeconds = getRetryAfterSeconds(error.response?.data?.retryAfterSeconds, error.response?.headers?.["retry-after"]);
      error.message = `Too many requests. Try again in ${retryAfterSeconds} seconds.`;
      Object.assign(error, { retryAfterSeconds });
      return Promise.reject(error);
    }

    // Session expired → clear storage and redirect to login
    if (status === 401 && !isAuthRoute) {
      const currentToken = getAuthStorage().getItem("token");
      const requestToken = error.config?.headers?.Authorization;
      // A revoked request from the previous account must not sign out the
      // account that has since logged in on this browser.
      if (!currentToken || requestToken !== `Bearer ${currentToken}`) {
        return Promise.reject(error);
      }
      if (currentToken && error.response?.data?.code === "SESSION_REPLACED") {
        if (!signingIn?.() && !isBrowserSignInPending()) endReplacedSession(currentToken);
        return Promise.reject(error);
      }
      clearAuthStorage();
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

    const publicMessage = getActionErrorMessage(error);
    error.message = validationMessage && status && status >= 400 && status < 500
      ? safeFeedbackMessage(validationMessage) : publicMessage;
    if (error.response && (!error.response.data || typeof error.response.data !== "object" || Array.isArray(error.response.data))) {
      // Proxies can return HTML/plain text instead of the API's JSON envelope.
      error.response.data = { message: error.message };
    } else if (error.response?.data) {
      error.response.data.message = error.message;
      if (error.response.data.errors) error.response.data.errors = status && status < 500
        ? error.response.data.errors.map(issue => ({ ...issue, message: safeFeedbackMessage(issue.message) })) : [];
    }
    return Promise.reject(error);
  },
);

export default api;
