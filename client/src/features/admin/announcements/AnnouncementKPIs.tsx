import React from "react";
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
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Avg. Read Rate",
      value: `${avgReadRate}%`,
      trend: `${totalRead.toLocaleString()} total reads`,
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Scheduled",
      value: scheduled.length,
      trend: scheduled.length > 0 ? "Queued to dispatch" : "None queued",
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Drafts",
      value: drafts.length,
      trend: drafts.length > 0 ? "In preparation" : "All dispatched",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.label}
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
            // Mobile (2 columns): right border on even index (0, 2)
            idx % 2 === 0 ? "border-r border-border/70" : "",
            // Desktop (4 columns): right border on 0, 1, 2, none on 3
            idx < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
            // Mobile (2 columns): bottom border on top row (0, 1)
            idx < 2 ? "border-b lg:border-b-0 border-border/70" : ""
          )}
        >
          <div className="flex items-center min-h-[22px]">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                kpi.tag
              )}
            >
              {kpi.label}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight tabular-nums">
            {kpi.value}
          </div>

          <div className="text-[11px] text-muted-foreground font-medium truncate">
            {kpi.trend}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementKPIs;
