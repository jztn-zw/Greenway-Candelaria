import { badgeStyles } from "@/components/ui/badgeStyles";
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
      dot: badgeStyles.error.dot,
      badge: badgeStyles.error.className,
    };
  }
  if (upper.includes("UPDATE") || upper.includes("STATUS") || upper.includes("FLAG") || upper.includes("LOGIN")) {
    return {
      dot: badgeStyles.warning.dot,
      badge: badgeStyles.warning.className,
    };
  }
  return {
    dot: badgeStyles.success.dot,
    badge: badgeStyles.success.className,
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
      timeAgo: formatRelativeTime(log.created_at, { emptyLabel: "Time unavailable" }),
      tone,
    };
  });

  return (
    <div
      className={`bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col min-w-0 h-full ${className}`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
          <h3 className="gw-heading text-base sm:text-lg text-foreground tracking-tight">
            Activity Stream
          </h3>

          <Button
            variant="primary-ghost"
            size="sm"
            className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer"
            onClick={() => navigate("/admin/audit-logs")}
          >
            <span>Audit Logs</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Stream List */}
        <ScrollArea className="h-[275px] sm:h-[315px] pr-3">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 sm:px-5">
                <ShieldCheck className="w-8 h-8 text-primary/60 mb-2" />
                <p className="text-xs font-semibold text-foreground">No audited activity yet</p>
                <p className="text-ui-caption text-muted-foreground mt-1">New administrative actions will appear here.</p>
              </div>
            ) : activities.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate("/admin/audit-logs")}
                className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/40 transition-colors cursor-pointer space-y-2 group"
              >
                {/* Top Row: Event Title + Module Tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.tone.dot}`}
                    />
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {a.actionText}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-ui-caption font-semibold px-2.5 py-0.5 rounded-md shrink-0 border ${a.tone.badge}`}
                  >
                    {a.moduleBadge}
                  </Badge>
                </div>

                {/* Bottom Row: Actor & Time */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-ui-caption text-muted-foreground pl-3">
                  <span className="min-w-0 flex-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                    <span className="truncate">{a.actor}</span>
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
