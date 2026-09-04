import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardAuditLog } from "./useAdminDashboard";
import { formatRelativeTime } from "@/utils/date";

interface Activity {
  id: string;
  description: string;
  timeAgo: string;
  type: "completed" | "created" | "updated" | "critical";
}

const dotStyles: Record<string, string> = {
  completed: "bg-emerald-500",
  created: "bg-sky-500",
  updated: "bg-amber-500",
  critical: "bg-destructive",
};

const formatAuditDescription = (log: DashboardAuditLog) => {
  const actor = log.user_name ? log.user_name.split(" ")[0] : "Admin";
  const action = log.action ? log.action.toLowerCase() : "updated";
  const module = log.module ? log.module.toLowerCase() : "system";
  return `${actor} ${action} ${module} record`;
};

const getAuditType = (action: string): "completed" | "created" | "updated" | "critical" => {
  const upper = (action || "").toUpperCase();
  if (upper.includes("RESOLV") || upper.includes("COMPLETE") || upper.includes("VERIF")) return "completed";
  if (upper.includes("CREATE") || upper.includes("REGISTER") || upper.includes("ADD")) return "created";
  if (upper.includes("DELETE") || upper.includes("DEACTIVATE") || upper.includes("SUSPEND")) return "critical";
  return "updated";
};

interface ActivityFeedProps {
  activityLogs?: DashboardAuditLog[];
  className?: string;
}

const ActivityFeed = ({ activityLogs, className = "" }: ActivityFeedProps) => {
  const navigate = useNavigate();

  const displayActivities: Activity[] = (activityLogs ?? []).map((log) => ({
        id: log.id,
        description: formatAuditDescription(log),
        timeAgo: formatRelativeTime(log.created_at, { emptyLabel: "Recently" }),
        type: getAuditType(log.action),
      }));

  return (
    <div
      className={`bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full ${className}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
                Activity Stream
              </h3>
              <p className="text-xs text-muted-foreground">
                Audited system actions
              </p>
            </div>
          </div>

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
        <ScrollArea className="h-[275px] sm:h-[295px] pr-2">
          <div className="space-y-2.5">
            {displayActivities.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border/70 bg-background/40 px-5">
                <ShieldCheck className="w-8 h-8 text-primary/60 mb-2" />
                <p className="text-xs font-semibold text-foreground">No audited activity yet</p>
                <p className="text-[11px] text-muted-foreground mt-1">New administrative actions will appear here.</p>
              </div>
            ) : displayActivities.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/30 transition-all"
              >
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-2xs ${
                    dotStyles[a.type] || "bg-primary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {a.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {a.timeAgo}
                  </p>
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
