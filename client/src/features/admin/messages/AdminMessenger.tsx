import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { MessagesSquare, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogTrigger, DialogPortal, DialogClose, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ConversationPanel } from "@/components/messenger/ConversationPanel";
import { useConversation } from "@/components/messenger/useConversation";
import type { DriverRow } from "@/services/trackingService";
import "./adminMessenger.css";

const AdminConversation = ({ driverId, targetId }: { driverId: string; targetId?: string }) => {
  const conversation = useConversation(driverId);
  const { refresh } = conversation;
  useEffect(() => { if (targetId) void refresh(targetId); }, [targetId, refresh]);
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden"><ConversationPanel conversation={conversation} admin targetId={targetId} /></div>;
};
export const AdminMessenger = ({ drivers, trigger, onOpenChange, collectorNotice }: {
  drivers: DriverRow[];
  trigger?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  collectorNotice?: ReactNode;
}) => {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [targetId, setTargetId] = useState<string>();
  const linkedDriver = params.get("messageDriver");
  const linkedMessage = params.get("message");
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  useEffect(() => {
    if (linkedDriver) { setDriverId(linkedDriver); setTargetId(linkedMessage ?? undefined); setOpen(true); }
  }, [linkedDriver, linkedMessage]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ driverId?: string; messageId?: string }>).detail;
      if (detail?.driverId) { setDriverId(detail.driverId); setTargetId(detail.messageId); setOpen(true); }
    };
    window.addEventListener("admin:open-messages", handler);
    return () => window.removeEventListener("admin:open-messages", handler);
  }, []);
  return <>
    <Dialog modal={false} open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value && linkedDriver) { const next = new URLSearchParams(params); next.delete("messageDriver"); next.delete("message"); setParams(next, { replace: true }); }
    }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogPortal>
      <DialogPrimitive.Content onInteractOutside={(event) => event.preventDefault()} className="admin-messenger-panel fixed z-30 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl focus:outline-none">
        <DialogHeader className="shrink-0 border-b border-border/70 px-4 py-3.5 text-left bg-card">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <MessagesSquare className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="gw-heading text-sm tracking-tight">Collector Messages</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs leading-relaxed">Message collectors anytime, even when offline or without a route.</DialogDescription>
            </div>
            <DialogClose asChild><Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-lg p-0" aria-label="Close"><X className="size-4" aria-hidden="true" /></Button></DialogClose>
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-1.5 px-4 py-3">
          {collectorNotice}
          <label className="text-xs font-medium text-foreground" htmlFor="messenger-collector">Collector</label>
          <SearchableSelect id="messenger-collector" aria-label="Collector" value={driverId || "none"}
            onValueChange={(value) => { setDriverId(value === "none" ? "" : value); setTargetId(undefined); }}
            options={[
              { value: "none", label: "Choose a Collector" },
              ...(driverId && !drivers.some((driver) => driver.id === driverId) ? [{ value: driverId, label: "Selected Collector" }] : []),
              ...drivers.filter((driver) => driver.account_status === "ACTIVE").map((driver) => ({ value: driver.id, label: driver.full_name })),
            ]}
            placeholder="Choose a collector" searchPlaceholder="Search by collector name…" compactSearchPlaceholder="Collector name…"
            className="h-10 w-full rounded-xl border-border/80 bg-background px-3 text-xs font-semibold shadow-2xs" />
        </div>

        <section aria-label="Collector conversation" className="mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/15">
          {driverId ? <AdminConversation key={driverId} driverId={driverId} targetId={targetId} /> : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground"><MessagesSquare className="size-5" /></span>
              <p className="text-sm font-semibold text-foreground">Select a collector</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Their messages will appear here, and you can reply in the same conversation.</p>
            </div>
          )}
        </section>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  </>;
};
