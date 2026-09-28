import { useCallback, useRef, useState } from "react";
import { useInfiniteQuery, useIsMutating, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { fetchConversation, sendConversationMessage, type ConversationPage, type WebMessage } from "@/services/messengerService";
import { markMyDriverMessagesAsRead } from "@/services/trackingService";
import useAuthStore from "@/store/authStore";

const unique = (messages: WebMessage[]) => [...new Map(messages.map((message) => [message.id, message])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
const requestId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  // getRandomValues also works when a local web installation uses HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export const useConversation = (driverId?: string, enabled = true) => {
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const role = driverId ? "ADMIN" : "DRIVER";
  const scope = driverId ? "admin" : "collector";
  const key = [scope, user?.id ?? "signed-out", "messenger", driverId ?? "me"] as const;
  const active = enabled && user?.role === role;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string>();
  const pending = useRef<{ text: string; id: string } | null>(null);
  const sendLock = useRef(false);
  const reading = useRef(new Set<string>());
  const readIds = useRef(new Set<string>());
  const assertSession = (expectedUser = user?.id, expectedToken = token) => {
    const session = useAuthStore.getState();
    if (session.user?.id !== expectedUser || session.token !== expectedToken || session.user?.role !== role) throw new Error("Your session changed");
  };
  const sendMutation = useMutation({
    mutationKey: [...key, "send"], retry: false, gcTime: 0,
    meta: { [`${scope}UserId`]: user?.id, [`${scope}Domains`]: ["messenger"] },
    mutationFn: async (request: { text: string; userId: string | undefined; token: string | null }) => {
      assertSession(request.userId, request.token);
      const text = request.text;
      if (pending.current?.text !== text) pending.current = { text, id: requestId() };
      return sendConversationMessage(text, pending.current.id, driverId);
    },
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (saved) => {
      assertSession();
      client.setQueryData<InfiniteData<ConversationPage, string | undefined>>(key, (current) => {
        if (!current) return { pages: [{ items: [saved], target: null, unreadCount: 0, nextCursor: null }], pageParams: [undefined] };
        return { ...current, pages: current.pages.map((page, index) => index === 0 ? { ...page, items: unique([...page.items, saved]) } : page) };
      });
      pending.current = null; setError(null);
    },
  });
  const readMutation = useMutation({
    mutationKey: [...key, "read"], retry: false, gcTime: 0,
    meta: { [`${scope}UserId`]: user?.id, [`${scope}Domains`]: ["messenger"] },
    mutationFn: async (request: { id: string; userId: string | undefined; token: string | null }) => { assertSession(request.userId, request.token); await markMyDriverMessagesAsRead(undefined, [request.id]); },
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (_, request) => {
      const id = request.id;
      assertSession(); readIds.current.add(id);
      client.setQueryData<InfiniteData<ConversationPage, string | undefined>>(key, (current) => current ? ({ ...current, pages: current.pages.map((page) => ({ ...page,
        unreadCount: Math.max(0, page.unreadCount - 1), items: page.items.map((message) => message.id === id ? { ...message, is_read: true } : message),
      })) }) : current);
      client.setQueryData<WebMessage>([...key, "target", id], (current) => current ? { ...current, is_read: true } : current);
    },
  });
  const writing = useIsMutating({ mutationKey: key });
  const conversation = useInfiniteQuery({
    queryKey: key, queryFn: ({ pageParam }) => fetchConversation(driverId, pageParam ? { cursor: pageParam } : undefined),
    initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 15_000, gcTime: 30 * 60_000, retry: false, refetchInterval: driverId ? 60_000 : 15_000,
    refetchIntervalInBackground: false, enabled: active && writing === 0,
  });
  const loaded = unique(conversation.data?.pages.flatMap((page) => page.items) ?? []);
  const target = useQuery({ queryKey: [...key, "target", targetId],
    queryFn: async () => (await fetchConversation(driverId, { message_id: targetId! })).target,
    enabled: active && writing === 0 && Boolean(targetId) && !loaded.some((message) => message.id === targetId), staleTime: 60_000, gcTime: 30 * 60_000, retry: false });
  const messages = target.data ? unique([...loaded, target.data]) : loaded;
  const { refetch } = conversation;
  const refresh = useCallback(async (selectedId?: string) => {
    setTargetId(selectedId); setError(null);
    if (client.isMutating({ mutationKey: [scope, user?.id ?? "signed-out", "messenger", driverId ?? "me"] })) return;
    await refetch();
  }, [client, scope, user?.id, driverId, refetch]);
  const loadOlder = async () => { if (conversation.hasNextPage && !conversation.isFetchingNextPage) await conversation.fetchNextPage(); };
  const send = async (value: string) => {
    const text = value.trim();
    if (!text || text.length > 255 || sendLock.current) return false;
    sendLock.current = true;
    try { await sendMutation.mutateAsync({ text, userId: user?.id, token }); return true; }
    catch { setError("Message could not be sent. Retry to safely resend the same message."); return false; }
    finally { sendLock.current = false; }
  };
  const readMessage = readMutation.mutateAsync;
  const markVisibleRead = useCallback(async (id: string) => {
    if (driverId || reading.current.has(id) || readIds.current.has(id)) return;
    reading.current.add(id);
    try { await readMessage({ id, userId: user?.id, token }); }
    catch { setError("Read status could not be saved. Please retry."); }
    finally { reading.current.delete(id); }
  }, [driverId, readMessage, user?.id, token]);
  return { messages, loading: conversation.isLoading,
    error: error ?? (conversation.error ? "Messages could not be refreshed. Please retry." : target.error ? "The selected message could not be loaded. Latest messages are still available." : null),
    unreadCount: conversation.data?.pages[0]?.unreadCount ?? 0,
    nextCursor: conversation.hasNextPage ? conversation.data?.pages[conversation.data.pages.length - 1]?.nextCursor ?? null : null,
    loadingOlder: conversation.isFetchingNextPage, sending: sendMutation.isPending, draft, setDraft, refresh, loadOlder, send, markVisibleRead };
};
