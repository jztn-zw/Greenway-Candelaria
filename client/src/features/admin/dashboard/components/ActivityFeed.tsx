import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, ShieldCheck, User, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardAuditLog } from "./useAdminDashboard";
import { formatRelativeTime } from "@/utils/date";

const ACTION_TITLES: Record<string, string> = {
  CREATE_REPORT: "Report Submitted",
  UPDATE_REPORT_STATUS: "Report Status Updated",
  UPDATE_REPORT_PRIORITY: "Report Priority Updated",
  FLAG_REPORT: "Report Flagged",
  ADD_REPORT_NOTE: "Internal Note Added",
  USER_LOGIN: "User Logged In",
  FAILED_LOGIN: "Failed Login Attempt",
  CHANGE_PASSWORD: "Password Changed",
  CREATE_POST: "Post Published",
  UPDATE_POST: "Post Updated",
  DELETE_POST: "Post Deleted",
  CREATE_ANNOUNCEMENT: "Announcement Created",
  UPDATE_ANNOUNCEMENT: "Announcement Updated",
  DELETE_ANNOUNCEMENT: "Announcement Deleted",
  CREATE_ROUTE: "Collection Route Created",
  UPDATE_ROUTE: "Collection Route Updated",
  DELETE_ROUTE: "Collection Route Deleted",
  CREATE_TRUCK: "Truck Registered",
  UPDATE_TRUCK: "Truck Updated",
  DELETE_TRUCK: "Truck Deleted",
  ASSIGN_DRIVER_TRUCK: "Driver Assigned to Truck",
  UPDATE_COLLECTION_SCHEDULE: "Schedule Updated",
  CREATE_COLLECTION_SCHEDULE: "Schedule Rule Created",
  UPDATE_REMINDER_SETTINGS: "Reminders Updated",
  CREATE_USER: "User Account Created",
  UPDATE_USER: "User Account Updated",
  DEACTIVATE_USER: "Account Deactivated",
  ACTIVATE_USER: "Account Activated",
  BAN_USER: "Account Suspended",
  UNBAN_USER: "Account Unsuspended",
  DELETE_USER: "Account Deleted",
  UPDATE_LANDING_CONTENT: "Landing Page Updated",
};

const MODULE_LABELS: Record<string, string> = {
  reports: "Waste Reports",
  posts: "Posts",
  announcements: "Announcements",
  routes: "Routes",
  trucks: "Fleet",
  schedule: "Schedule",
  users: "Accounts",
  auth: "Security",
  barangays: "Barangays",
  "landing-content": "Public Page",
};

const formatActionTitle = (action: string) => {
  if (!action) return "System Action";
  const upper = action.toUpperCase();
  if (ACTION_TITLES[upper]) return ACTION_TITLES[upper];
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatModuleBadge = (module: string) => {
  if (!module) return "System";
  const lower = module.toLowerCase();
  return MODULE_LABELS[lower] || module.charAt(0).toUpperCase() + module.slice(1);
};

const getEventTone = (action: string) => {
  const upper = (action || "").toUpperCase();
  if (upper.includes("DELETE") || upper.includes("FAIL") || upper.includes("DEACTIVATE") || upper.includes("BAN")) {
    return {
      dot: "bg-destructive",
      badge: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
  if (upper.includes("UPDATE") || upper.includes("STATUS") || upper.includes("FLAG") || upper.includes("LOGIN")) {
    return {
      dot: "bg-amber-500",
      badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    };
  }
  return {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  };
};

interface ActivityFeedProps {
  activityLogs?: DashboardAuditLog[];
  className?: string;
}

const ActivityFeed = ({ activityLogs, className = "" }: ActivityFeedProps) => {
  const navigate = useNavigate();

  const activities = (activityLogs ?? []).map((log) => {
    const tone = getEventTone(log.action);
    return {
      id: log.id,
      actor: log.user_name || "System",
      actionText: formatActionTitle(log.action),
      moduleBadge: formatModuleBadge(log.module),
      timeAgo: formatRelativeTime(log.created_at, { emptyLabel: "Recently" }),
      tone,
    };
  });

  return (
    <div
      className={`bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full ${className}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground font-display">
            Activity Stream
          </h3>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary font-semibold h-8 px-3 gap-1.5 hover:bg-primary/10 hover:text-primary rounded-xl cursor-pointer group active:scale-95 transition-all"
            onClick={() => navigate("/admin/audit-logs")}
          >
            <span>Audit Logs</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Stream List */}
        <ScrollArea className="h-[275px] sm:h-[315px] pr-2">
          <div className="space-y-2">
            {activities.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border/70 bg-background/40 px-5">
                <ShieldCheck className="w-8 h-8 text-primary/60 mb-2" />
                <p className="text-xs font-semibold text-foreground">No audited activity yet</p>
                <p className="text-[11px] text-muted-foreground mt-1">New administrative actions will appear here.</p>
              </div>
            ) : activities.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate("/admin/audit-logs")}
                className="p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer space-y-1.5 group"
              >
                {/* Top Row: Event Title + Module Tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 shadow-2xs ${a.tone.dot}`}
                    />
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {a.actionText}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-md shrink-0 border shadow-2xs ${a.tone.badge}`}
                  >
                    {a.moduleBadge}
                  </Badge>
                </div>

                {/* Bottom Row: Actor & Time */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-3.5">
                  <span className="truncate flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                    <span>{a.actor}</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1 tabular-nums">
                    <Clock className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                    <span>{a.timeAgo}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ActivityFeed;
