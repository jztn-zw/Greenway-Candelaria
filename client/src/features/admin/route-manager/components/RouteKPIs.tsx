import React from "react";
import { cn } from "@/lib/utils";
import { Route, CircleCheck, PauseCircle, MapPin } from "lucide-react";
import { adminRouteStyles as routeStyles } from "@/components/communityContentStyles";

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
      description: "Saved collection routes",
      icon: Route,
      tone: "bg-muted/70 text-muted-foreground",
    },
    {
      title: "Enabled Routes",
      value: activeRoutes,
      description:
        totalRoutes > 0
          ? `${Math.round((activeRoutes / totalRoutes) * 100)}% active operations`
          : "0 active",
      icon: CircleCheck,
      tone: "bg-success/10 text-success-foreground",
    },
    {
      title: "Paused Routes",
      value: inactiveRoutes,
      description:
        totalRoutes > 0
          ? `${Math.round((inactiveRoutes / totalRoutes) * 100)}% inactive`
          : "0 paused",
      icon: PauseCircle,
      tone: "bg-warning/10 text-warning-foreground",
    },
    {
      title: "Barangays Covered",
      value:
        totalBarangays > 0
          ? `${coveredBarangays}/${totalBarangays}`
          : `${coveredBarangays}`,
      description: `${coveragePct}% municipal coverage`,
      icon: MapPin,
      tone: "bg-info/10 text-info-foreground",
    },
  ];

  return (
    <div className={routeStyles.stats}>
      {kpis.map((kpi) => (
        <div key={kpi.title} className={routeStyles.stat}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-ui-caption font-medium text-muted-foreground break-words">{kpi.title}</span>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", kpi.tone)}>
              <kpi.icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="gw-stat-value text-2xl sm:text-3xl text-foreground tracking-tight tabular-nums">
            {kpi.value}
          </div>
          <div className="text-ui-caption text-muted-foreground font-medium break-words">
            {kpi.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RouteKPIs;
