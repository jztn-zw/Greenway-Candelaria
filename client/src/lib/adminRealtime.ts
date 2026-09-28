import type { QueryClient } from "@tanstack/react-query";

const FAST_DOMAINS = ["reports", "residents", "drivers", "trucks", "routes", "tracking", "barangays", "schedule", "posts", "announcements", "notifications"];
const SUMMARY_DOMAINS = ["dashboard", "analytics"];


// One coordinator for the admin layout. Batches bursts, preserves query keys,
// and refreshes active observers only; inactive screens are simply marked stale.
export const createQueryRealtime = (client: QueryClient, userId: string,
  isVisible: () => boolean, role: string, fastDomains: string[], summaryDomains: string[], fallbackDomains: string[]) => {
  const allowed = new Set([...fastDomains, ...summaryDomains, ...fallbackDomains]);
  const fast = new Set<string>();
  const summaries = new Set<string>();
  let fastTimer: ReturnType<typeof setTimeout> | undefined;
  let summaryTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const isWriting = (domain: string) => client.isMutating({ predicate: (mutation) =>
    mutation.meta?.[`${role}UserId`] === userId && Array.isArray(mutation.meta?.[`${role}Domains`])
      && (mutation.meta[`${role}Domains`] as string[]).includes(domain) }) > 0;

  const flush = async (pending: Set<string>) => {
    if (disposed || !isVisible()) return;
    const domains = new Set([...pending].filter((domain) => !isWriting(domain)));
    domains.forEach((domain) => pending.delete(domain));
    if (domains.size) {
      const predicate = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === role
        && query.queryKey[1] === userId && domains.has(String(query.queryKey[2]));
      // An initial read started before the change may contain old data too.
      await client.cancelQueries({ predicate });
      if (!disposed) await client.invalidateQueries({ predicate, refetchType: "active" });
    }
    schedule();
  };
  const schedule = () => {
    if (disposed || !isVisible()) return;
    if (fast.size && !fastTimer) fastTimer = setTimeout(() => {
      fastTimer = undefined;
      void flush(fast);
    }, 300);
    // Fixed batching window: a continuous event stream cannot postpone forever.
    if (summaries.size && !summaryTimer) summaryTimer = setTimeout(() => {
      summaryTimer = undefined;
      void flush(summaries);
    }, 2000);
  };
  const changed = (domains: unknown) => {
    if (disposed || !Array.isArray(domains)) return;
    for (const domain of domains) {
      if (typeof domain !== "string" || !allowed.has(domain)) continue;
      (summaryDomains.includes(domain) ? summaries : fast).add(domain);
    }
    schedule();
  };
  const reconcile = () => changed([...allowed]);
  // Existing tracking, notification, dashboard and analytics queries have their
  // own polling. Reconcile the other lists and audit without doubling those timers.
  const fallback = setInterval(() => {
    if (isVisible()) changed(fallbackDomains);
  }, 60_000);
  return {
    changed,
    reconcile,
    dispose: () => {
      disposed = true;
      clearInterval(fallback);
      clearTimeout(fastTimer);
      clearTimeout(summaryTimer);
      fast.clear(); summaries.clear();
    },
  };
};

export const createAdminRealtime = (client: QueryClient, userId: string,
  isVisible = () => document.visibilityState !== "hidden") => createQueryRealtime(client, userId, isVisible,
    "admin", [...FAST_DOMAINS, "audit"], SUMMARY_DOMAINS,
    [...FAST_DOMAINS.filter((domain) => !["tracking", "notifications"].includes(domain)), "audit"]);

const RESIDENT_DOMAINS = ["reports", "profile", "settings", "schedule", "routes", "barangays", "posts", "announcements", "notifications"];
export const createResidentRealtime = (client: QueryClient, userId: string,
  isVisible = () => document.visibilityState !== "hidden") => createQueryRealtime(client, userId, isVisible,
    "resident", [...RESIDENT_DOMAINS, "tracking"], [], RESIDENT_DOMAINS);
