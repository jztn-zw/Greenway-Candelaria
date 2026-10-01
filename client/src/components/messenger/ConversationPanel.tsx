import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseApiTimestamp } from "@/utils/date";
import { useConversation } from "./useConversation";

type Conversation = ReturnType<typeof useConversation>;
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
  const { messages, loading, error, nextCursor, loadingOlder, sending, draft, setDraft, refresh, loadOlder, send, markVisibleRead } = conversation;
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousLast = useRef<string>();
  const scrolledTarget = useRef<string>();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
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
    if (admin || !scrollRef.current || !window.IntersectionObserver) return;
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
  }, [messages, admin, markVisibleRead]);
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
    {error && <div role="alert" className="p-3 text-xs"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void refresh()}>Retry latest messages</Button></div>}
    <div ref={scrollRef} onScroll={() => { const root = scrollRef.current; if (root) nearBottom.current = root.scrollHeight - root.scrollTop - root.clientHeight < 48; }} className={cn("min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-4", admin ? "bg-muted/10" : "bg-background/20")} aria-label="Conversation messages">
      {nextCursor && <Button variant="outline" size="sm" onClick={() => void handleOlder()} disabled={loadingOlder}>{loadingOlder ? "Loading older messages…" : "Load older messages"}</Button>}
      {loading ? <p role="status" className="text-xs text-muted-foreground">Loading messages…</p> : !messages.length && !error ? <p className="py-8 text-center text-xs text-muted-foreground">No messages yet.</p> : null}
      {messages.map((message) => {
        const own = admin ? message.sender_role === "ADMIN" : message.sender_role === "DRIVER";
        return <div key={message.id} data-message-id={message.id} data-unread={!admin && message.sender_role !== "DRIVER" && !message.is_read} className={cn("flex", message.id === targetId && "rounded-xl ring-2 ring-primary", own ? "justify-end" : "justify-start")}>
          <div className={cn("max-w-[85%] rounded-2xl border px-3.5 py-2.5 text-xs shadow-2xs", own ? "border-primary/20 bg-primary/10" : "border-border/70 bg-card")}>
            <div className="mb-1 text-ui-overline text-muted-foreground"><span className="font-semibold">{!admin && own ? "You" : message.sender_name}</span> · {timestamp(message.created_at, now)}</div>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
          </div>
        </div>;
      })}<div ref={endRef} />
    </div>
    <footer className={cn("border-t border-border/70 p-3", admin && "bg-card/80")}>
      <div className="flex gap-2"><Input aria-label={admin ? "Message collector" : "Message MENRO"} maxLength={255} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSend(); } }} placeholder={admin ? "Message collector…" : "Message MENRO…"} disabled={sending} className="h-10 rounded-xl border-border/80 bg-background text-xs" /><Button aria-label="Send message" type="button" onClick={() => void handleSend()} disabled={!draft.trim() || sending} className="size-10 shrink-0 rounded-xl"><Send className="size-4" /></Button></div>
      <p className="mt-1.5 text-right text-ui-overline tabular-nums text-muted-foreground">{draft.length}/255</p>
    </footer>
  </>;
};
