import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageSquareText, Route, SkipForward, CheckCircle2, Shield } from "lucide-react";
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

  const config = typeConfig[notification.type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${config.accent}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{config.label}</p>
              <DialogTitle className="text-base font-display">{notification.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <DialogDescription asChild>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-foreground leading-relaxed">{notification.details || notification.message}</p>
            <p className="text-xs text-muted-foreground">{notification.time}</p>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default CollectorNotificationModal;
