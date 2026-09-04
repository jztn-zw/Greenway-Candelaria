import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarClock, Truck, CheckCircle2, AlertTriangle, Megaphone, CircleAlert } from "lucide-react";
import type { ResidentNotification } from "./types";
import { useNavigate } from "react-router-dom";

interface NotificationModalProps {
  notification: ResidentNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<string, { icon: React.ElementType; accent: string; label: string }> = {
  "collection-reminder": { icon: CalendarClock, accent: "text-primary", label: "Collection Reminder" },
  "truck-near": { icon: Truck, accent: "text-primary", label: "Truck Alert" },
  "collection-done": { icon: CheckCircle2, accent: "text-leaf", label: "Collection Complete" },
  "schedule-change": { icon: AlertTriangle, accent: "text-earth-dark", label: "Schedule Change" },
  "system-announcement": { icon: Megaphone, accent: "text-primary", label: "MENRO Announcement" },
  "missed-collection": { icon: CircleAlert, accent: "text-destructive", label: "Missed Collection" },
};

const NotificationModal = ({ notification, open, onOpenChange }: NotificationModalProps) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const config = typeConfig[notification.type];
  if (!config) return null;

  const Icon = config.icon;

  const handleReport = () => {
    onOpenChange(false);
    navigate("/resident/report");
  };

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

            {notification.type === "missed-collection" && (
              <Button onClick={handleReport} className="w-full mt-2">
                Report Missed Collection
              </Button>
            )}
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
