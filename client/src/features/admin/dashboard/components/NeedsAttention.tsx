import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  FileText,
  Truck,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnalyticsOverview, ReportsAnalytics } from "./useAdminDashboard";

interface AttentionItem {
  id: string;
  description: string;
  timeAgo: string;
  priority: "high" | "medium" | "low";
  action: string;
  route: string;
  icon: React.ElementType;
}

interface NeedsAttentionProps {
  overview?: AnalyticsOverview | null;
  reportsAnalytics?: ReportsAnalytics | null;
}

const priorityStyles: Record<
  string,
  { bg: string; text: string; border: string; iconBox: string }
> = {
  high: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/25",
    iconBox: "bg-destructive/10 text-destructive border-destructive/20",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/25",
    iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  low: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border/60",
    iconBox: "bg-muted text-muted-foreground border-border/60",
  },
};

const NeedsAttention = ({ overview }: NeedsAttentionProps) => {
  const navigate = useNavigate();
  const pendingCount = overview?.reports?.pending ?? 0;

  const items: AttentionItem[] = pendingCount > 0 ? [
    {
      id: "1",
      description: `${pendingCount} pending waste incident reports awaiting triage`,
      timeAgo: "Live queue",
      priority: pendingCount >= 5 ? "high" : "medium",
      action: "Review",
      route: "/admin/reports",
      icon: FileText,
    },
  ] : [];

  const noIssues = items.length === 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
                Needs Attention
              </h3>
              <p className="text-xs text-muted-foreground">
                Urgent triage & operational alerts
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="bg-destructive/10 text-destructive border-destructive/25 text-xs font-bold px-2 py-0.5 rounded-full"
          >
            {items.length} items
          </Badge>
        </div>

        {/* List */}
        {noIssues ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-background rounded-xl border border-border/80">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-foreground">
              All systems normal
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No urgent alerts requiring administrative intervention
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const style = priorityStyles[item.priority] || priorityStyles.low;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="bg-background border border-border/80 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${style.iconBox}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug truncate">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timeAgo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold px-1.5 py-0 rounded-sm border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2.5 shrink-0 rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer font-semibold group/btn active:scale-95"
                    onClick={() => navigate(item.route)}
                  >
                    <span>{item.action}</span>
                    <ArrowRight className="w-3 h-3 ml-1 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeedsAttention;
