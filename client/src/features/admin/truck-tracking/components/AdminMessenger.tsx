import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessagesSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ConversationPanel } from "@/components/messenger/ConversationPanel";
import { useConversation } from "@/components/messenger/useConversation";
import type { DriverRow } from "@/services/trackingService";

const AdminConversation = ({ driverId, targetId, onConversationViewed }: { driverId: string; targetId?: string; onConversationViewed: (driverId: string, message: { id: string; created_at: string }) => void }) => {
  const conversation = useConversation(driverId);
  const { refresh } = conversation;
  useEffect(() => { if (targetId) void refresh(targetId); }, [targetId, refresh]);
  const latestIncoming = [...conversation.messages].reverse().find((message) => message.sender_role === "DRIVER");
  const latestIncomingId = latestIncoming?.id;
  const latestIncomingAt = latestIncoming?.created_at;
  useEffect(() => {
    if (!conversation.loading && !conversation.error && latestIncomingId && latestIncomingAt) {
      onConversationViewed(driverId, { id: latestIncomingId, created_at: latestIncomingAt });
    }
  }, [conversation.loading, conversation.error, latestIncomingId, latestIncomingAt, driverId, onConversationViewed]);
  return <div className="flex h-[min(380px,48dvh)] min-h-0 flex-col overflow-hidden"><ConversationPanel conversation={conversation} admin targetId={targetId} /></div>;
};
export const AdminMessenger = ({ drivers, unreadMessageNotifications, markNotificationAsRead, onConversationViewed }: {
  drivers: DriverRow[];
  unreadMessageNotifications: Map<string, string[]>;
  markNotificationAsRead: (id: string) => Promise<void>;
  onConversationViewed: (driverId: string, message: { id: string; created_at: string }) => void;
}) => {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [targetId, setTargetId] = useState<string>();
  const acknowledged = useRef(new Set<string>());
  const linkedDriver = params.get("messageDriver");
  const linkedMessage = params.get("message");
  useEffect(() => {
    if (linkedDriver) { setDriverId(linkedDriver); setTargetId(linkedMessage ?? undefined); setOpen(true); }
  }, [linkedDriver, linkedMessage]);
  useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent<{ driverId?: string }>).detail?.driverId;
      if (id) { setDriverId(id); setTargetId(undefined); setOpen(true); }
    };
    window.addEventListener("admin:open-messages", handler);
    return () => window.removeEventListener("admin:open-messages", handler);
  }, []);
  useEffect(() => {
    if (!open || !driverId) return;
    for (const id of unreadMessageNotifications.get(driverId) ?? []) {
      if (acknowledged.current.has(id)) continue;
      acknowledged.current.add(id);
      void markNotificationAsRead(id);
    }
  }, [open, driverId, unreadMessageNotifications, markNotificationAsRead]);
  return <>
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value && linkedDriver) { const next = new URLSearchParams(params); next.delete("messageDriver"); next.delete("message"); setParams(next, { replace: true }); }
    }}>
      <DialogContent className="flex w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0 shadow-2xl">
        <DialogHeader className="gw-modal-header shrink-0 border-b border-border/70 px-5 py-4 pr-12 text-left bg-card">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <MessagesSquare className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="gw-heading text-base tracking-tight">Collector messages</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs leading-relaxed">Choose a collector to view messages and send a reply.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-1.5 px-5 py-4">
          <label className="text-xs font-medium text-foreground" htmlFor="messenger-collector">Collector</label>
          <SearchableSelect id="messenger-collector" aria-label="Collector" value={driverId || "none"}
            onValueChange={(value) => { setDriverId(value === "none" ? "" : value); setTargetId(undefined); }}
            options={[
              { value: "none", label: "Choose a collector" },
              ...(driverId && !drivers.some((driver) => driver.id === driverId) ? [{ value: driverId, label: "Selected collector" }] : []),
              ...drivers.filter((driver) => driver.account_status === "ACTIVE").map((driver) => ({ value: driver.id, label: driver.full_name })),
            ]}
            placeholder="Choose a collector" searchPlaceholder="Search collectors..."
            className="h-10 w-full rounded-xl border-border/80 bg-background px-3 text-xs font-semibold shadow-2xs" />
        </div>

        <section aria-label="Collector conversation" className="mx-5 mb-5 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/15">
          {driverId ? <AdminConversation key={driverId} driverId={driverId} targetId={targetId} onConversationViewed={onConversationViewed} /> : (
            <div className="flex h-[min(380px,48dvh)] flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground"><MessagesSquare className="size-5" /></span>
              <p className="text-sm font-semibold text-foreground">Select a collector</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Their messages will appear here, and you can reply in the same conversation.</p>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  </>;
};
