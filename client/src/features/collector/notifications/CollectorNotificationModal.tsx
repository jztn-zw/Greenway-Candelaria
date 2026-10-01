import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Route, SkipForward, CheckCircle2, Shield, Bell, Megaphone, FileText, CalendarClock } from "lucide-react";
import type { NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime } from "@/utils/date";
import { getCollectorNotificationDestination, getCollectorNotificationTitle, openCollectorNotification } from "./notificationRouting";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { CollectorModalHeader } from "../components/CollectorModal";
import { collectorModalStyles as styles } from "../components/collectorModalStyles";

interface Props {
  notification: NotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<NotificationRow["type"], { icon: React.ElementType; accent: string; label: string }> = {
  "NEW_POST": { icon: MessageSquareText, accent: "text-primary", label: "Update" },
  "COLLECTION_REMINDER": { icon: Route, accent: "text-primary", label: "Route Alert" },
  "MISSED_COLLECTION": { icon: SkipForward, accent: "text-leaf", label: "Missed Collection" },
  "COLLECTION_DONE": { icon: CheckCircle2, accent: "text-leaf", label: "Collection Completed" },
  "ANNOUNCEMENT": { icon: Megaphone, accent: "text-primary", label: "Announcement" },
  "REPORT_UPDATE": { icon: FileText, accent: "text-primary", label: "Report Update" },
  "TRUCK_IS_NEAR": { icon: CalendarClock, accent: "text-primary", label: "Truck Nearby" },
  "SYSTEM": { icon: Shield, accent: "text-amber-600 dark:text-amber-400", label: "System Alert" },
};

const CollectorNotificationModal = ({ notification, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  if (!notification || notification.user_id !== userId) return null;
  const destination = getCollectorNotificationDestination(notification);

  const config = typeConfig[notification.type] || {
    icon: Bell,
    accent: "text-primary",
    label: "Notification",
  };

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <CollectorModalHeader title="Notification" description={config.label} icon={<Icon className={config.accent} />} onClose={() => onOpenChange(false)} />

        <div className={styles.body}>
          <div className="space-y-1">
            <h3 className="gw-heading text-base text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">{getCollectorNotificationTitle(notification)}</h3>
            {notification.created_at && <p className="text-xs text-muted-foreground font-normal">{formatRelativeTime(notification.created_at)}</p>}
          </div>
          <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-md p-3.5 max-h-[38vh] overflow-y-auto scrollbar-thin">{notification.body}</div>
        </div>
        <div className={styles.footer}>
          {(notification.ref_module === "driver-messages" || destination) && <Button type="button" variant="outline" className={styles.cancelButton} onClick={() => { if (openCollectorNotification(notification, navigate)) onOpenChange(false); }}>{notification.ref_module === "driver-messages" ? "Open messages" : "Open related page"}</Button>}
          <Button type="button" onClick={() => onOpenChange(false)} className={styles.primaryButton}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectorNotificationModal;
