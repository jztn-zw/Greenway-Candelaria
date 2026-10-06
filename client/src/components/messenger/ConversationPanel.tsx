import { getSystemNow } from "@/lib/serverClock";
import ActionButtonLoader from "@/components/common/ActionButtonLoader";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseApiTimestamp } from "@/utils/date";
import { useConversation } from "./useConversation";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { profileAvatarForAccount, profileAvatarImageSrc } from "@/components/common/profileAvatars";

type Conversation = ReturnType<typeof useConversation>;
const resizeComposer = (element: HTMLTextAreaElement) => {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + 2}px`;
};
const timestamp = (value: string, now: number) => {
  const date = parseApiTimestamp(value);
  if (!date) return "Time unavailable";
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
};
export const ConversationPanel = ({ conversation, admin = false, targetId }: { conversation: Conversation; admin?: boolean; targetId?: string }) => {
  const { messages, loading, refreshing, error, nextCursor, loadingOlder, sending, draft, setDraft, refresh, loadOlder, send, markVisibleRead } = conversation;
  const [now, setNow] = useState(() => getSystemNow());
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const previousLast = useRef<string>();
  const scrolledTarget = useRef<string>();
  useLayoutEffect(() => {
    if (composerRef.current) resizeComposer(composerRef.current);
  }, [draft, admin]);
  useEffect(() => {
    const element = composerRef.current;
    if (!element || !window.ResizeObserver) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      resizeComposer(element);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(getSystemNow()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const last = messages[messages.length - 1]?.id;
    const target = targetId ? [...(scrollRef.current?.querySelectorAll<HTMLElement>("[data-message-id]") ?? [])].find((element) => element.dataset.messageId === targetId) : null;
    if (target && scrolledTarget.current !== targetId) { target.scrollIntoView({ block: "nearest" }); scrolledTarget.current = targetId; }
    else if (!targetId && nearBottom.current && last !== previousLast.current) endRef.current?.scrollIntoView({ block: "nearest" });
    previousLast.current = last;
  }, [messages, targetId]);
  useEffect(() => {
    if (loading || !scrollRef.current || !window.IntersectionObserver) return;
    const root = scrollRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
        const id = (entry.target as HTMLElement).dataset.messageId;
        if (id) void markVisibleRead(id);
      }
    }, { root, threshold: 0.75 });
    const observe = () => {
      observer.disconnect();
      root.querySelectorAll('[data-unread="true"]').forEach((element) => observer.observe(element));
    };
    observe(); window.addEventListener("focus", observe); document.addEventListener("visibilitychange", observe);
    return () => { observer.disconnect(); window.removeEventListener("focus", observe); document.removeEventListener("visibilitychange", observe); };
  }, [messages, loading, markVisibleRead]);
  const handleSend = async () => {
    if (await send(draft)) { setDraft(""); nearBottom.current = true; endRef.current?.scrollIntoView({ block: "nearest" }); }
  };
  const handleOlder = async () => {
    const root = scrollRef.current;
    const height = root?.scrollHeight ?? 0; const top = root?.scrollTop ?? 0;
    await loadOlder();
    requestAnimationFrame(() => { if (root) root.scrollTop = top + root.scrollHeight - height; });
  };
  return <>
    {error && !admin && <DataRefreshNotice primary role="alert" className="m-3" message={error} onRetry={() => void refresh()} retrying={refreshing} />}
    <div ref={scrollRef} onScroll={() => { const root = scrollRef.current; if (root) nearBottom.current = root.scrollHeight - root.scrollTop - root.clientHeight < 48; }} className={cn("min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto bg-background/25 px-4 py-4", !admin && "collector-dispatch-messages")} aria-label="Conversation messages">
      {error && admin && <DataRefreshNotice primary role="alert" message={error} onRetry={() => void refresh()} retrying={refreshing} />}
      {nextCursor && <div className={admin ? undefined : "flex justify-center"}><Button variant="outline" size="sm" className={admin ? undefined : "h-9 max-w-full rounded-lg px-3 text-xs"} onClick={() => void handleOlder()} disabled={loadingOlder} loading={loadingOlder} loadingLabel="Loading older messages…">Load older messages</Button></div>}
      {loading && (admin ? (
        <div role="status" aria-label="Loading messages" className="flex min-h-full items-center justify-center text-primary">
          <ActionButtonLoader variant="display" />
          <span className="sr-only">Loading messages…</span>
        </div>
      ) : (
        <div role="status" aria-label="Loading messages" className="space-y-4">
          <span className="sr-only">Loading messages…</span>
          {[false, true, false].map((own, index) => (
            <div key={index} aria-hidden="true" className={cn("flex items-end gap-2", own && "justify-end")}>
              {!own && <Skeleton className="mb-6 size-6 shrink-0 rounded-full" />}
              <div className="w-[72%] min-w-0 space-y-1.5">
                {!own && <Skeleton className="ml-3 h-3 w-24 max-w-full" />}
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className={cn("h-2.5 w-12", own ? "ml-auto mr-3" : "ml-3")} />
              </div>
            </div>
          ))}
        </div>
      ))}
      {!loading && !messages.length && !error && (admin ? <p className="py-8 text-center text-xs text-muted-foreground">No messages yet.</p> : (
        <div className="flex min-h-full flex-col items-center justify-center px-3 py-8 text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><MessageSquare aria-hidden="true" className="size-5" /></span>
          <p className="text-sm font-semibold text-foreground">No messages yet.</p>
          <p className="mt-1 max-w-60 text-xs leading-relaxed text-muted-foreground">Send MENRO a message about your route or truck.</p>
        </div>
      ))}
      {messages.map((message) => {
        const own = admin ? message.sender_role === "ADMIN" : message.sender_role === "DRIVER";
        return <div key={message.id} data-message-id={message.id} data-unread={!own && !message.is_read} className={cn("flex min-w-0 items-end gap-2", message.id === targetId && "rounded-xl ring-2 ring-primary", own ? "justify-end" : "justify-start")}>
              {!own && <Avatar aria-hidden="true" className="mb-6 size-6"><AvatarImage src={profileAvatarImageSrc(profileAvatarForAccount(message.sender_id, message.sender_avatar_url))} alt="" className="object-cover object-center" /><AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">{message.sender_name.trim().split(/\s+/).slice(0, 2).map((name) => Array.from(name)[0] ?? "").join("").toUpperCase() || "M"}</AvatarFallback></Avatar>}
              <div className={cn("min-w-0", own ? "max-w-[88%]" : "max-w-[calc(100%-2rem)]")}>
                {own ? <span className="sr-only">You</span> : <p className="mb-1 px-3 break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{message.sender_name}</p>}
                <p className={cn("w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]", own ? "ml-auto bg-primary text-primary-foreground" : "bg-muted/70 text-foreground")}>{message.message}</p>
                <p className={cn("mt-1 px-3 text-[11px] leading-relaxed tabular-nums text-muted-foreground", own && "text-right")}>{timestamp(message.created_at, now)}</p>
              </div>
        </div>;
      })}<div ref={endRef} />
    </div>
    <footer className={cn("shrink-0 border-t border-border/70 p-3", admin ? "bg-card/80" : "collector-dispatch-composer bg-card")}>
      <div className="flex min-w-0 items-end gap-2">
        <Textarea ref={composerRef} rows={1} aria-label={admin ? "Message collector" : "Message MENRO"} maxLength={1000} value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSend(); } }}
          placeholder={admin ? "Message collector…" : "Message MENRO…"} disabled={sending}
          className={cn("max-h-[min(8rem,20dvh)] min-w-0 resize-none overflow-x-hidden overflow-y-auto rounded-xl border-border/80 bg-background text-base leading-5 sm:text-sm [overflow-wrap:anywhere]", admin ? "min-h-10 py-2 sm:text-xs" : "min-h-11 py-2.5")} />
        <Button aria-label={sending ? "Sending message…" : "Send message"} aria-busy={sending} type="button" onClick={() => void handleSend()} disabled={!draft.trim() || sending} className={cn("shrink-0 rounded-xl", admin ? "size-10" : "size-11")}>{sending ? <ActionButtonLoader className="gw-action-loader--compact" /> : <Send aria-hidden="true" className="size-4" />}</Button>
      </div>
    </footer>
  </>;
};
