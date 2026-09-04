import React from "react";
import { Megaphone, Eye, Clock, FileText } from "lucide-react";
import { Announcement } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  announcements: Announcement[];
}

const AnnouncementKPIs: React.FC<Props> = ({ announcements }) => {
  const active = announcements.filter((a) => a.status === "Active" && !a.archived);
  const scheduled = announcements.filter((a) => a.status === "Scheduled" && !a.archived);
  const drafts = announcements.filter((a) => a.status === "Draft" && !a.archived);

  const totalSent = active.reduce((sum, a) => sum + a.totalRecipients, 0);
  const totalRead = active.reduce((sum, a) => sum + a.readCount, 0);
  const avgReadRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

  const kpis = [
    {
      label: "Active Notices",
      value: active.length,
      trend: "Live to residents",
      icon: Megaphone,
      accent: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: "Avg. Read Rate",
      value: `${avgReadRate}%`,
      trend: `${totalRead.toLocaleString()} read`,
      icon: Eye,
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Scheduled",
      value: scheduled.length,
      trend: scheduled.length > 0 ? "Queued to send" : "None queued",
      icon: Clock,
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Drafts",
      value: drafts.length,
      trend: drafts.length > 0 ? "In preparation" : "All sent",
      icon: FileText,
      accent: "bg-muted text-muted-foreground border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {kpi.label}
              </span>
              <div
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                  kpi.accent
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {kpi.value}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {kpi.trend}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementKPIs;
