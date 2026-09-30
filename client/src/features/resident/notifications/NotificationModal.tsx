import { FormDialog } from "@/components/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { Button } from "@/components/ui/button";
import { CalendarClock, Truck, CheckCircle2, AlertTriangle, Megaphone, CircleAlert, Bell } from "lucide-react";
import type { ResidentNotification } from "./types";

interface NotificationModalProps {
  notification: ResidentNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewSchedule?: () => void;
}

const typeConfig: Record<string, { icon: React.ElementType; accent: string; label: string }> = {
  "collection-reminder": { icon: CalendarClock, accent: "text-primary", label: "Collection Reminder" },
  "truck-near": { icon: Truck, accent: "text-primary", label: "Truck Alert" },
  "collection-done": { icon: CheckCircle2, accent: "text-leaf", label: "Collection Complete" },
  "schedule-change": { icon: AlertTriangle, accent: "text-earth-dark", label: "Schedule Change" },
  "system-announcement": { icon: Megaphone, accent: "text-primary", label: "MENRO Announcement" },
  "announcement": { icon: Megaphone, accent: "text-primary", label: "MENRO Announcement" },
  "system": { icon: Bell, accent: "text-primary", label: "System Notification" },
  "missed-collection": { icon: CircleAlert, accent: "text-destructive", label: "Missed Collection" },
};

const NotificationModal = ({ notification, open, onOpenChange, onViewSchedule }: NotificationModalProps) => {
  if (!notification) return null;

  const config = typeConfig[notification.type] || {
    icon: Bell,
    accent: "text-primary",
    label: "Notification",
  };

  const Icon = config.icon;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Notification" description={config.label} icon={<Icon className={config.accent} />}
      footer={
        <>
          {notification.type === "collection-reminder" && onViewSchedule && (
            <Button type="button" variant="outline" onClick={onViewSchedule} className={modalStyles.cancelButton}>View schedule</Button>
          )}
          <Button type="button" onClick={() => onOpenChange(false)} className={modalStyles.primaryButton}>Close</Button>
        </>
      }>
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground break-words [overflow-wrap:anywhere]">{notification.title}</h3>
        {notification.time && <p className="text-xs text-muted-foreground">{notification.time}</p>}
      </div>
      <div className="whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 p-3.5 text-xs leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
        {notification.details || notification.message}
      </div>
    </FormDialog>
  );
};

export default NotificationModal;
