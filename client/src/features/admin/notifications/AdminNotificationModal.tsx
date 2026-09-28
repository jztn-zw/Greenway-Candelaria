import React from "react";
import { Button } from "@/components/ui/button";
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
  X,
} from "lucide-react";

export interface AdminNotificationDetail {
  id: string;
  title: string;
  message: string;
  time: string;
  type: string;
  details?: string;
  ref_module?: string | null;
  metadata?: Record<string, unknown> | string | null;
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
  let report: Record<string, unknown> = {};
  if (notification.ref_module === "truck-breakdowns") {
    try {
      report = typeof notification.metadata === "string" ? JSON.parse(notification.metadata) : notification.metadata || {};
    } catch { /* The notification body remains available for older records. */ }
  }
  const reportText = (key: string) => typeof report[key] === "string" ? report[key] as string : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="px-5 py-4 border-b border-border/60 flex flex-row items-center justify-between gap-3 text-left shrink-0 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center ${config.accent} shrink-0 shadow-2xs`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm lg:text-base font-bold font-display text-foreground tracking-tight truncate">Notification</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">{notification.ref_module === "truck-breakdowns" ? "Vehicle breakdown report" : config.label}</DialogDescription>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1" title="Close">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3 text-left overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
          <div className="space-y-1">
            <h3 className="text-base font-bold font-display text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">{notification.title}</h3>
            {notification.time && (
              <p className="text-xs text-muted-foreground font-normal">
                <span>{notification.time}</span>
              </p>
            )}
          </div>
          {notification.ref_module === "truck-breakdowns" && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-2 text-sm">
              <p><span className="font-semibold">Vehicle:</span> {reportText("truck_name") || "Assigned truck"}{reportText("truck_plate") ? ` (${reportText("truck_plate")})` : ""}</p>
              <p><span className="font-semibold">Collector:</span> {reportText("driver_name") || "Unknown"}</p>
              <p><span className="font-semibold">Issue:</span> {reportText("category") || "Vehicle breakdown"}</p>
              <p><span className="font-semibold">Priority:</span> {report.urgent === true ? "Critical road hazard" : "Standard"}</p>
              <p className="font-semibold">Description and location</p>
              <p className="whitespace-pre-wrap break-words">{reportText("description") || notification.message}</p>
            </div>
          )}
          {notification.ref_module !== "truck-breakdowns" && <div className="text-xs lg:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-xl p-3.5 lg:p-4 max-h-[38vh] overflow-y-auto scrollbar-thin">
            {notification.details || notification.message}
          </div>}
        </div>
        <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full lg:w-auto h-9 px-6 rounded-xl text-xs lg:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs cursor-pointer">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationModal;
