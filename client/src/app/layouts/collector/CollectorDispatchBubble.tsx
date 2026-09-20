import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Minimize2, Send, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  fetchMyDriverMessages,
  markMyDriverMessagesAsRead,
  updateMyDriverStatusMessage,
  type DriverMessageRow,
} from "@/services/trackingService";

const parseMessageTimestamp = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (match) {
    const [, year, month, day, hour, minute, second, milliseconds = "0"] = match;
    return new Date(Date.UTC(
      Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(milliseconds.padEnd(3, "0")),
    ));
  }
  return new Date(value);
};

const formatChatTimestamp = (value: string) => {
  const date = parseMessageTimestamp(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return isToday
    ? time
    : `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${time}`;
};

const CollectorDispatchBubble = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DriverMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const hasLoadedMessagesRef = useRef(false);
  const knownIncomingMessageIdsRef = useRef(new Set<string>());

  const isHidden = ["/collector/profile", "/collector/settings"].some((path) => location.pathname.startsWith(path));
  const loadMessages = useCallback(async () => {
    try {
      const nextMessages = await fetchMyDriverMessages(undefined, 300);
      const incomingMessages = nextMessages.filter(
        (message) => message.sender_role?.toUpperCase() !== "DRIVER",
      );
      const hasNewIncomingMessage = hasLoadedMessagesRef.current && incomingMessages.some(
        (message) => !knownIncomingMessageIdsRef.current.has(message.id),
      );

      knownIncomingMessageIdsRef.current = new Set(incomingMessages.map((message) => message.id));
      hasLoadedMessagesRef.current = true;
      setMessages(nextMessages);

      if (hasNewIncomingMessage) {
        setIsOpen(true);
      }
    } catch {
      // A future poll can recover from a temporary network error.
    }
  }, []);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), 15_000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    const openMessages = () => setIsOpen(true);
    window.addEventListener("collector:open-messages", openMessages);
    return () => window.removeEventListener("collector:open-messages", openMessages);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void markMyDriverMessagesAsRead();
    endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [isOpen, messages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    try {
      setIsSending(true);
      await updateMyDriverStatusMessage(text);
      setMessages((current) => [...current, {
        id: `local-${Date.now()}`,
        driver_id: "",
        route_id: null,
        sender_user_id: "",
        sender_role: "DRIVER",
        sender_name: "You",
        message: text,
        is_read: true,
        created_at: new Date().toISOString(),
      }]);
      setDraft("");
    } catch {
      toast.error("Could not send message");
    } finally {
      setIsSending(false);
    }
  };

  if (isHidden) return null;

  const unreadCount = messages.filter((message) => message.sender_role?.toUpperCase() !== "DRIVER" && !message.is_read).length;

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className="fixed bottom-5 right-4 z-30 flex h-12 items-center gap-2.5 rounded-full border border-primary/30 bg-card px-4 text-left text-foreground shadow-xl shadow-black/15 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/40 active:scale-95 sm:bottom-6 sm:right-6" aria-label="Open MENRO messages">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><MessageSquare className="size-4" />{unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground ring-2 ring-card">{unreadCount > 9 ? "9+" : unreadCount}</span>}</span>
        <span className="text-xs font-bold">Messages</span>
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-3 z-30 flex h-[min(430px,calc(100dvh-2rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl sm:bottom-6 sm:right-6 sm:h-[460px]">
      <header className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-3.5 py-3">
        <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><MessageSquare className="size-4" /></span><div><h2 className="text-sm font-bold text-foreground">MENRO Messages</h2><p className="text-[10px] text-muted-foreground">Admin and collector conversation</p></div></div>
        <div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="size-8 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Minimize messages"><Minimize2 className="size-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="size-8 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close messages"><X className="size-4" /></Button></div>
      </header>
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-background/20 px-3.5 py-4">
        {messages.length === 0 ? <p className="py-12 text-center text-xs text-muted-foreground">Start a conversation with MENRO dispatch.</p> : messages.map((message) => {
          const isCollector = message.sender_role?.toUpperCase() === "DRIVER";
          return <div key={message.id} className={cn("flex", isCollector ? "justify-end" : "justify-start")}><div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-xs", isCollector ? "rounded-br-md border border-primary/20 bg-primary/10" : "rounded-bl-md border border-border/70 bg-muted/60")}><div className="mb-0.5 flex items-center gap-1.5 text-[9px]"><span className={cn("font-bold", isCollector ? "text-primary" : "text-foreground")}>{isCollector ? "You" : "MENRO Admin"}</span><span className="text-muted-foreground">{formatChatTimestamp(message.created_at)}</span></div><p className="leading-relaxed text-foreground">{message.message}</p></div></div>;
        })}
        <div ref={endRef} />
      </div>
      <footer className="flex gap-2 border-t border-border/70 p-3"><Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void sendMessage()} placeholder="Message MENRO…" disabled={isSending} className="h-10 rounded-xl text-xs" /><Button type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || isSending} className="size-10 shrink-0 rounded-xl"><Send className="size-4" /></Button></footer>
    </section>
  );
};

export default CollectorDispatchBubble;
