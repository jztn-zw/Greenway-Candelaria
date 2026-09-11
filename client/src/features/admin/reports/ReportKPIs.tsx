import type { AdminReportsKPIs } from "@/services/reportsService";
import type { WasteReport } from "./types";
import { cn } from "@/lib/utils";

interface ReportKPIsProps {
  reports?: WasteReport[];
  kpis?: AdminReportsKPIs;
}

const ReportKPIs = ({ reports = [], kpis }: ReportKPIsProps) => {
  const total = kpis ? kpis.total : reports.length;
  const pending = kpis
    ? kpis.pending
    : reports.filter((r) => r.status === "Submitted" || r.status === "Under Review").length;
  const dispatched = kpis
    ? kpis.dispatched
    : reports.filter((r) => r.status === "Dispatched").length;
  const resolved = kpis
    ? kpis.resolved
    : reports.filter((r) => r.status === "Resolved").length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const items = [
    {
      label: "Total Reports",
      value: total,
      subtext: `${resolutionRate}% overall resolution`,
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Pending Review",
      value: pending,
      subtext: pending > 0 ? "Requires verification" : "All reviewed",
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "In Dispatch",
      value: dispatched,
      subtext: dispatched > 0 ? "Crews actively deployed" : "No active dispatches",
      tag: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      label: "Resolved Cases",
      value: resolved,
      subtext: `${resolved} remediated on site`,
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {items.map((item, idx) => (
        <div
          key={item.label}
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
                item.tag
              )}
            >
              {item.label}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight tabular-nums">
            {item.value}
          </div>

          <div className="text-[11px] text-muted-foreground font-medium truncate">
            {item.subtext}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportKPIs;
