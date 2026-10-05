import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversation } from "@/components/messenger/useConversation";
import { ConversationPanel } from "@/components/messenger/ConversationPanel";
import "./collectorDispatch.css";

const CollectorDispatchBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState<string>();
  const conversation = useConversation();
  const { refresh, unreadCount } = conversation;
  useEffect(() => {
    const open = (event: Event) => {
      const id = (event as CustomEvent<{ messageId?: string }>).detail?.messageId;
      setTargetId(id); setIsOpen(true); void refresh(id);
    };
    window.addEventListener("collector:open-messages", open);
    return () => window.removeEventListener("collector:open-messages", open);
  }, [refresh]);
  if (!isOpen) return <button type="button" onClick={() => { setTargetId(undefined); setIsOpen(true); void refresh(); }} className="gw-action-outline fixed bottom-5 right-4 z-30 flex h-11 items-center gap-2 rounded-lg border px-4 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:bottom-6 sm:right-6" aria-label={`Open MENRO messages${unreadCount ? `, ${unreadCount} unread` : ""}`}>
    <MessageSquare className="size-4" /><span className="text-xs font-bold">Messages</span>{unreadCount > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
  </button>;
  return <section aria-label="MENRO messages" className="collector-dispatch-panel fixed z-30 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
    <header className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-card px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><MessageSquare aria-hidden="true" className="size-5" /></span>
      <div className="min-w-0 flex-1"><h2 className="gw-heading text-sm leading-snug text-foreground">MENRO Messages</h2><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Your conversation with MENRO</p></div>
      <Button variant="outline" size="icon" className="size-10 shrink-0 rounded-xl" aria-label="Close messages" onClick={() => setIsOpen(false)}><X aria-hidden="true" className="size-4" /></Button>
    </header>
    <ConversationPanel conversation={conversation} targetId={targetId} />
  </section>;
};
export default CollectorDispatchBubble;
