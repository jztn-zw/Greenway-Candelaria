export const GENERIC_ACTION_ERROR = "Could not complete that action. Please try again.";

/** Keep actionable domain/validation messages; hide implementation details. */
export const safeFeedbackMessage = (value: unknown, fallback = GENERIC_ACTION_ERROR): string => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const message = value.trim();
  if (/^(network error|network unavailable|offline|failed to fetch|load failed)$/i.test(message)) return "Cannot connect to GreenWay. Check your internet connection and try again.";
  if (/timeout|timed out|ECONNABORTED|ETIMEDOUT/i.test(message)) return "The request timed out. Please try again.";
  if (/^forbidden$/i.test(message)) return "You do not have permission to perform this action.";
  if (/^not found$/i.test(message)) return "This item is no longer available. Refresh the page and try again.";
  if (message === "Today's route run has already started. Finish it before changing this route.")
    return "Collection is already in progress. Wait until the collector finishes before changing this route.";
  if (message === "Pause this route before deleting it") return "Disable this route before deleting it.";
  if (message.length > 500 || /\bSQL\b|\bER_[A-Z_]+\b|\b(?:TypeError|ReferenceError|SyntaxError|AxiosError|Prisma|Sequelize|mysql)\b|cannot read propert|is not a function|is not defined|unexpected token|request failed with status code|\b(?:internal server error|unknown error|unexpected error)\b|^error$|\b(?:Bearer\s|authorization\s*:)|(?:password|secret|token|api[_-]?key)\s*[:=]|https?:\/\/|<\/?(?:html|script|body)|\b(?:SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s.+\sSET)\b/i.test(message)) return fallback;
  return message;
};

export const getActionErrorMessage = (error: unknown, fallback = GENERIC_ACTION_ERROR): string => {
  const failure = error as { response?: { status?: number; data?: { message?: unknown } }; message?: unknown; code?: string } | null;
  if ((failure?.response?.status ?? 0) >= 500) return fallback;
  // The web interceptor adds the retry delay to the rate-limit error message.
  if (failure?.response?.status === 429) return safeFeedbackMessage(failure.message ?? failure.response.data?.message, fallback);
  if (failure?.code === "ERR_NETWORK") return safeFeedbackMessage("Network Error");
  if (failure?.code === "ECONNABORTED" || failure?.code === "ETIMEDOUT") return safeFeedbackMessage("timeout");
  return safeFeedbackMessage(failure?.response?.data?.message ?? failure?.message ?? error, fallback);
};
