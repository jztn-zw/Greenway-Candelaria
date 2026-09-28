import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";

export const collectorKey = (userId: string | undefined, domain: string, ...parts: unknown[]) => ["collector", userId ?? "signed-out", domain, ...parts] as const;
export const collectorQueryDefaults = { staleTime: 60_000, gcTime: 30 * 60_000, retry: false, refetchInterval: 60_000, refetchIntervalInBackground: false } as const;
export const useCollectorQuery = <T>(domain: string, parts: QueryKey, queryFn: () => Promise<T>, options: { enabled?: boolean; refetchInterval?: number | false } = {}) => {
  const user = useAuthStore((state) => state.user);
  return useQuery({ queryKey: collectorKey(user?.id, domain, ...parts), queryFn, ...collectorQueryDefaults, ...options, enabled: user?.role === "DRIVER" && options.enabled !== false });
};
export const useCollectorAction = (...domains: string[]) => {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);
  const matches = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === "collector" && query.queryKey[1] === userId && domains.includes(String(query.queryKey[2]));
  const { mutateAsync } = useMutation({
    scope: { id: `collector-write:${userId}` }, meta: { collectorUserId: userId, collectorDomains: domains },
    retry: false, gcTime: 0,
    mutationFn: (request: { action: () => Promise<unknown>; userId: string | undefined; token: string | null }) => {
      const current = useAuthStore.getState();
      if (current.user?.id !== request.userId || current.user?.role !== "DRIVER" || current.token !== request.token) throw new Error("Your session changed. Please try again.");
      return request.action();
    },
    onMutate: () => client.cancelQueries({ predicate: matches }),
    onSettled: () => { void client.invalidateQueries({ predicate: matches }); },
  });
  return useCallback(<T,>(action: () => Promise<T>) => mutateAsync({ action, userId, token }) as Promise<T>, [mutateAsync, userId, token]);
};
