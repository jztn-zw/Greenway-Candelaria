import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversation } from "@/components/messenger/useConversation";
import { ConversationPanel } from "@/components/messenger/ConversationPanel";

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
  if (!isOpen) return <button type="button" onClick={() => { setTargetId(undefined); setIsOpen(true); void refresh(); }} className="fixed bottom-5 right-4 z-30 flex h-12 items-center gap-2.5 rounded-full border border-primary/30 bg-card px-4 text-foreground shadow-xl sm:bottom-6 sm:right-6" aria-label={`Open MENRO messages${unreadCount ? `, ${unreadCount} unread` : ""}`}>
    <MessageSquare className="size-4" /><span className="text-xs font-bold">Messages</span>{unreadCount > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
  </button>;
  return <section aria-label="MENRO messages" className="fixed bottom-4 right-3 z-30 flex h-[min(430px,calc(100dvh-2rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl sm:bottom-6 sm:right-6 sm:h-[460px]">
    <header className="flex items-center justify-between border-b border-border/70 px-3.5 py-3"><div><h2 className="text-sm font-bold">MENRO Messages</h2><p className="text-[10px] text-muted-foreground">Admin and collector conversation</p></div><Button variant="ghost" size="icon" aria-label="Close messages" onClick={() => setIsOpen(false)}><X className="size-4" /></Button></header>
    <ConversationPanel conversation={conversation} targetId={targetId} />
  </section>;
};
export default CollectorDispatchBubble;
