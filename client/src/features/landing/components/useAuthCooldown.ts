import { useCallback, useEffect, useRef, useState } from "react";
import { getRetryAfterSeconds } from "@/lib/rateLimit";

// Persist only an expiry, never credentials. The server remains authoritative.
const readExpiry = (key: string) => {
  try {
    const expiry = Number(sessionStorage.getItem(key));
    return Number.isFinite(expiry) && expiry > Date.now() && expiry <= Date.now() + 86_400_000 ? expiry : 0;
  } catch { return 0; }
};

export const useAuthCooldown = (action: "login" | "register") => {
  const key = `greenway.auth-cooldown.${action}`;
  const [until, setUntil] = useState(() => readExpiry(key));
  const deadline = useRef(until);
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((until - Date.now()) / 1000)));
  useEffect(() => {
    if (!until) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) {
        deadline.current = 0; setUntil(0);
        try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [key, until]);

  const start = useCallback((error: unknown) => {
    const failure = error as { retryAfterSeconds?: number; response?: { status?: number; data?: { retryAfterSeconds?: number }; headers?: Record<string, unknown> } } | null;
    if (failure?.response?.status !== 429) return false;
    const wait = getRetryAfterSeconds(failure.retryAfterSeconds ?? failure.response.data?.retryAfterSeconds, failure.response.headers?.["retry-after"]);
    const expiry = Date.now() + wait * 1000;
    deadline.current = expiry; setUntil(expiry); setSeconds(wait);
    try { sessionStorage.setItem(key, String(expiry)); } catch { /* Keep the in-memory cooldown. */ }
    return true;
  }, [key]);

  return { seconds, start, isBlocked: () => deadline.current > Date.now() };
};
