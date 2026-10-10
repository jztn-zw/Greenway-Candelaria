export const getRetryAfterSeconds = (bodySeconds: unknown, header: unknown): number => {
  const seconds = Number(bodySeconds ?? header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const date = typeof header === "string" ? Date.parse(header) : NaN;
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - Date.now()) / 1000)) : 60;
};

export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status !== 429 && failureCount < 3;
};
