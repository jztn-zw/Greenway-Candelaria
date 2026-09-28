import useAuthStore from "@/store/authStore";
import { hashKey, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { SetStateAction } from "react";
import { useCallback, useRef } from "react";

export const adminKey = (userId: string | undefined, domain: string, ...parts: unknown[]) =>
  ["admin", userId ?? "signed-out", domain, ...parts] as const;

export const useAdminQuery = <T>(
  domain: string,
  parts: QueryKey,
  queryFn: () => Promise<T>,
  options: { enabled?: boolean; staleTime?: number; refetchInterval?: number | false } = {},
) => {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: adminKey(user?.id, domain, ...parts),
    queryFn,
    staleTime: 30_000,
    retry: false,
    refetchIntervalInBackground: false,
    ...options,
    enabled: user?.role === "ADMIN" && options.enabled !== false,
  });
};

// Existing forms keep their validation, dialogs and success messages. This helper
// owns mutation execution and marks related server data stale after a saved change.
// Refetch failures never turn an already-saved change into a failed mutation.
export const useAdminAction = (...domains: string[]) => {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { mutateAsync } = useMutation({
    meta: { adminUserId: userId, adminDomains: [...domains, "dashboard", "analytics", "audit"] },
    mutationFn: (action: () => Promise<unknown>) => action(),
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      const affected = new Set([...domains, "dashboard", "analytics", "audit"]);
      void client.invalidateQueries({
        predicate: ({ queryKey }) => queryKey[0] === "admin" && queryKey[1] === userId && affected.has(String(queryKey[2])),
      });
    },
  });
  return useCallback(<T,>(action: () => Promise<T>) => mutateAsync(action) as Promise<T>, [mutateAsync]);
};

export const useAdminMutation = <Args extends unknown[], Result>(
  mutationFn: (...args: Args) => Promise<Result>, ...domains: string[]
) => {
  const run = useAdminAction(...domains);
  return useCallback((...args: Args) => run(() => mutationFn(...args)), [run, mutationFn]);
};

// For explicit operations such as opening a detail or exporting a filtered list.
export const useAdminFetch = () => {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  return useCallback(<T,>(domain: string, parts: QueryKey, queryFn: () => Promise<T>) =>
    client.fetchQuery({ queryKey: adminKey(userId, domain, ...parts), queryFn, staleTime: 0, retry: false }), [client, userId]);
};

export const useAdminResource = <T,>(domain: string, parts: QueryKey, queryFn: () => Promise<T>, initial: T,
  options: Parameters<typeof useAdminQuery<T>>[3] = {}) => {
  const query = useAdminQuery(domain, parts, queryFn, options);
  const initialRef = useRef(initial);
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const serializedKey = hashKey(adminKey(userId, domain, ...parts));
  const setData = useCallback((update: SetStateAction<T>) => {
    client.setQueryData<T>(JSON.parse(serializedKey), (previous) =>
      typeof update === "function" ? (update as (previous: T) => T)(previous ?? initialRef.current) : update);
  }, [client, serializedKey]);
  return { ...query, data: query.data ?? initial, setData };
};
