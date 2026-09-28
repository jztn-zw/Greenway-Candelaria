import useAuthStore from "@/store/authStore";
import { hashKey, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { SetStateAction } from "react";
import { useCallback, useRef } from "react";

export const residentKey = (userId: string | undefined, domain: string, ...parts: unknown[]) =>
  ["resident", userId ?? "signed-out", domain, ...parts] as const;

export const useResidentQuery = <T>(
  domain: string,
  parts: QueryKey,
  queryFn: () => Promise<T>,
  options: { enabled?: boolean; staleTime?: number; refetchInterval?: number | false; keepPreviousData?: boolean } = {},
) => {
  const user = useAuthStore((state) => state.user);
  const { keepPreviousData, ...queryOptions } = options;
  const scope = `${user?.barangay_id ?? ""}:${user?.street_id ?? ""}`;
  return useQuery({
    queryKey: residentKey(user?.id, domain, `${user?.barangay_id ?? ""}:${user?.street_id ?? ""}`, ...parts),
    queryFn,
    staleTime: 30_000,
    retry: false,
    refetchIntervalInBackground: false,
    placeholderData: (previous, previousQuery) => keepPreviousData && previousQuery?.queryKey[1] === user?.id
      && previousQuery?.queryKey[3] === scope ? previous : undefined,
    ...queryOptions,
    enabled: user?.role === "RESIDENT" && options.enabled !== false,
  });
};

// Existing forms keep their validation, dialogs and success messages. This helper
// owns mutation execution and marks related server data stale after a saved change.
// Refetch failures never turn an already-saved change into a failed mutation.
export const useResidentAction = (...domains: string[]) => {
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const token = useAuthStore((state) => state.token);
  const { mutateAsync } = useMutation({
    scope: { id: `resident-write:${userId}` },
    meta: { residentUserId: userId, residentDomains: domains },
    mutationFn: (request: { action: () => Promise<unknown>; userId: string | undefined; token: string | null }) => {
      const session = useAuthStore.getState();
      if (session.user?.id !== request.userId || session.user?.role !== "RESIDENT" || session.token !== request.token)
        return Promise.reject(new Error("Your session changed. Please try again."));
      return request.action();
    },
    retry: false,
    gcTime: 0,
    onMutate: () => client.cancelQueries({ predicate: ({ queryKey }) =>
      queryKey[0] === "resident" && queryKey[1] === userId && domains.includes(String(queryKey[2])) }),
    onSettled: () => {
      const affected = new Set(domains);
      if (client.isMutating({ predicate: (mutation) => mutation.meta?.residentUserId === userId
        && Array.isArray(mutation.meta?.residentDomains)
        && mutation.meta.residentDomains.some((domain: string) => affected.has(domain)) }) > 1) return;
      void client.invalidateQueries({
        predicate: ({ queryKey }) => queryKey[0] === "resident" && queryKey[1] === userId && affected.has(String(queryKey[2])),
      });
    },
  });
  return useCallback(<T,>(action: () => Promise<T>) => mutateAsync({ action, userId, token }) as Promise<T>, [mutateAsync, userId, token]);
};

export const useResidentMutation = <Args extends unknown[], Result>(
  mutationFn: (...args: Args) => Promise<Result>, ...domains: string[]
) => {
  const run = useResidentAction(...domains);
  return useCallback((...args: Args) => run(() => mutationFn(...args)), [run, mutationFn]);
};

// For explicit operations such as opening a detail or exporting a filtered list.
export const useResidentFetch = () => {
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const scope = `${user?.barangay_id ?? ""}:${user?.street_id ?? ""}`;
  return useCallback(<T,>(domain: string, parts: QueryKey, queryFn: () => Promise<T>) =>
    client.fetchQuery({ queryKey: residentKey(userId, domain, scope, ...parts), queryFn, staleTime: 0, retry: false }), [client, userId, scope]);
};

export const useResidentResource = <T,>(domain: string, parts: QueryKey, queryFn: () => Promise<T>, initial: T,
  options: Parameters<typeof useResidentQuery<T>>[3] = {}) => {
  const query = useResidentQuery(domain, parts, queryFn, options);
  const initialRef = useRef(initial);
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const scope = `${user?.barangay_id ?? ""}:${user?.street_id ?? ""}`;
  const serializedKey = hashKey(residentKey(userId, domain, scope, ...parts));
  const setData = useCallback((update: SetStateAction<T>) => {
    client.setQueryData<T>(JSON.parse(serializedKey), (previous) =>
      typeof update === "function" ? (update as (previous: T) => T)(previous ?? initialRef.current) : update);
  }, [client, serializedKey]);
  return { ...query, data: query.data ?? initialRef.current, setData };
};
