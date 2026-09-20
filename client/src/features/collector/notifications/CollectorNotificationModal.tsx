import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Route, SkipForward, CheckCircle2, Shield, Bell, X } from "lucide-react";
import type { CollectorNotification } from "./types";

interface Props {
  notification: CollectorNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<string, { icon: React.ElementType; accent: string; label: string }> = {
  "admin-message": { icon: MessageSquareText, accent: "text-primary", label: "Admin Message" },
  "route-alert": { icon: Route, accent: "text-primary", label: "Route Alert" },
  "skip-acknowledged": { icon: SkipForward, accent: "text-leaf", label: "Skip Acknowledged" },
  "route-completed": { icon: CheckCircle2, accent: "text-leaf", label: "Route Completed" },
  "system-alert": { icon: Shield, accent: "text-amber-600 dark:text-amber-400", label: "System Alert" },
};

const CollectorNotificationModal = ({ notification, open, onOpenChange }: Props) => {
  if (!notification) return null;

  const config = typeConfig[notification.type] || {
    icon: Bell,
    accent: "text-primary",
    label: "Notification",
  };

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] lg:max-w-md max-h-[90vh] !flex flex-col p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="px-5 py-4 border-b border-border/60 flex flex-row items-center justify-between gap-3 text-left shrink-0 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center ${config.accent} shrink-0 shadow-2xs`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm lg:text-base font-bold font-display text-foreground tracking-tight truncate">Notification</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">{config.label}</DialogDescription>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1" title="Close"><X className="w-4 h-4" /></button>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-5 py-4 space-y-3 text-left overflow-y-auto overscroll-contain max-h-[calc(85vh-130px)] scrollbar-thin">
          <div className="space-y-1">
            <h3 className="text-base font-bold font-display text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">{notification.title}</h3>
            {notification.time && <p className="text-xs text-muted-foreground font-normal">{notification.time}</p>}
          </div>
          <div className="text-xs lg:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-xl p-3.5 lg:p-4 max-h-[38vh] overflow-y-auto scrollbar-thin">{notification.details || notification.message}</div>
        </div>
        <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full lg:w-auto h-9 px-6 rounded-xl text-xs lg:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs cursor-pointer">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectorNotificationModal;
