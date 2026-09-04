import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarClock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  FileText,
  Newspaper,
  Bell,
} from "lucide-react";

export interface AdminNotificationDetail {
  id: string;
  title: string;
  message: string;
  time: string;
  type: string;
  details?: string;
}

interface AdminNotificationModalProps {
  notification: AdminNotificationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<
  string,
  { icon: React.ElementType; accent: string; label: string }
> = {
  COLLECTION_REMINDER: {
    icon: CalendarClock,
    accent: "bg-primary/10 text-primary border-primary/20",
    label: "Collection Schedule",
  },
  TRUCK_IS_NEAR: {
    icon: Truck,
    accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    label: "Fleet Proximity",
  },
  COLLECTION_DONE: {
    icon: CheckCircle2,
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    label: "Route Completed",
  },
  MISSED_COLLECTION: {
    icon: AlertTriangle,
    accent: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Missed Collection",
  },
  REPORT_UPDATE: {
    icon: FileText,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "Waste Incident Report",
  },
  NEW_POST: {
    icon: Newspaper,
    accent: "bg-primary/10 text-primary border-primary/20",
    label: "Article Published",
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    accent: "bg-primary/10 text-primary border-primary/20",
    label: "MENRO Announcement",
  },
  SYSTEM: {
    icon: Bell,
    accent: "bg-primary/10 text-primary border-primary/20",
    label: "System Broadcast",
  },
};

const AdminNotificationModal: React.FC<AdminNotificationModalProps> = ({
  notification,
  open,
  onOpenChange,
}) => {
  if (!notification) return null;

  const config = typeConfig[notification.type] || {
    icon: Bell,
    accent: "bg-primary/10 text-primary border-primary/20",
    label: "Notification",
  };

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${config.accent}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {config.label}
              </p>
              <DialogTitle className="text-base font-display font-bold">
                {notification.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <DialogDescription asChild>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {notification.details || notification.message}
            </p>
            <p className="text-xs text-muted-foreground">{notification.time}</p>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationModal;
