import React from "react";
import { cn } from "@/lib/utils";

interface RouteKPIsProps {
  totalRoutes: number;
  activeRoutes: number;
  coveredBarangays: number;
  totalBarangays: number;
}

export const RouteKPIs: React.FC<RouteKPIsProps> = ({
  totalRoutes,
  activeRoutes,
  coveredBarangays,
  totalBarangays,
}) => {
  const inactiveRoutes = Math.max(0, totalRoutes - activeRoutes);
  const coveragePct =
    totalBarangays > 0
      ? Math.round((coveredBarangays / totalBarangays) * 100)
      : 0;

  const kpis = [
    {
      title: "Total Routes",
      value: totalRoutes,
      description: "Collection sector paths",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      title: "Enabled Routes",
      value: activeRoutes,
      description:
        totalRoutes > 0
          ? `${Math.round((activeRoutes / totalRoutes) * 100)}% active operations`
          : "0 active",
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Paused Routes",
      value: inactiveRoutes,
      description:
        totalRoutes > 0
          ? `${Math.round((inactiveRoutes / totalRoutes) * 100)}% inactive`
          : "0 paused",
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      title: "Barangays Covered",
      value:
        totalBarangays > 0
          ? `${coveredBarangays}/${totalBarangays}`
          : `${coveredBarangays}`,
      description: `${coveragePct}% municipal coverage`,
      tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.title}
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
              {kpi.title}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight tabular-nums">
            {kpi.value}
          </div>

          <div className="text-[11px] text-muted-foreground font-medium truncate">
            {kpi.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RouteKPIs;
