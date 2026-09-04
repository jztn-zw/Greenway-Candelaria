import React from "react";
import { Route, Play, Pause, MapPin } from "lucide-react";
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
      icon: Route,
      iconBox: "bg-primary/10 text-primary border-primary/20",
    },
    {
      title: "Enabled Routes",
      value: activeRoutes,
      description: "Available for operations",
      icon: Play,
      iconBox:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Paused Routes",
      value: inactiveRoutes,
      description: "Saved outside operations",
      icon: Pause,
      iconBox:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      title: "Barangays Covered",
      value: totalBarangays > 0 ? `${coveredBarangays}/${totalBarangays}` : `${coveredBarangays}`,
      description: `${coveragePct}% municipal coverage`,
      icon: MapPin,
      iconBox: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {kpi.title}
              </span>
              <div
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                  kpi.iconBox
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {kpi.value}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {kpi.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteKPIs;
