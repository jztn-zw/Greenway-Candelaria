import { Megaphone, Eye, Clock, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Announcement } from "./types";

interface Props {
  announcements: Announcement[];
}

const AnnouncementKPIs = ({ announcements }: Props) => {
  const active = announcements.filter((a) => a.status === "Active" && !a.archived);
  const scheduled = announcements.filter((a) => a.status === "Scheduled" && !a.archived);
  const drafts = announcements.filter((a) => a.status === "Draft" && !a.archived);

  const totalSent = active.reduce((sum, a) => sum + a.totalRecipients, 0);
  const totalRead = active.reduce((sum, a) => sum + a.readCount, 0);
  const avgReadRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

  const kpis = [
    {
      label: "Total Active",
      value: active.length,
      trend: "+2",
      trendUp: true,
      icon: Megaphone,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Avg. Read Rate",
      value: `${avgReadRate}%`,
      trend: "+4.2%",
      trendUp: true,
      icon: Eye,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Scheduled",
      value: scheduled.length,
      trend: "On track",
      trendUp: true,
      icon: Clock,
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Drafts",
      value: drafts.length,
      trend: "Pending",
      trendUp: false,
      icon: FileText,
      accent: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className="text-2xl font-bold font-display text-foreground mt-2 tabular-nums">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1.5">
                {kpi.trendUp ? (
                  <TrendingUp className="w-3 h-3 text-primary" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={`text-[10px] font-medium ${kpi.trendUp ? "text-primary" : "text-muted-foreground"}`}>
                  {kpi.trend}
                </span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.accent}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementKPIs;
