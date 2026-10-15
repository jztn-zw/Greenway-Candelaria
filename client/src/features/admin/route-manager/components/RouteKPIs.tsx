import { AdminKpiCard, AdminKpiGrid, type AdminKpiTone } from "@/components/admin/AdminKpiCards";
import { Route, CircleCheck, PauseCircle, MapPin, type LucideIcon } from "lucide-react";

interface RouteKPIsProps {
  totalRoutes: number;
  activeRoutes: number;
  coveredBarangays: number;
  totalBarangays: number;
}

export const RouteKPIs = ({
  totalRoutes,
  activeRoutes,
  coveredBarangays,
  totalBarangays,
}: RouteKPIsProps) => {
  const inactiveRoutes = Math.max(0, totalRoutes - activeRoutes);
  const coveragePct =
    totalBarangays > 0
      ? Math.round((coveredBarangays / totalBarangays) * 100)
      : 0;

  const kpis: { title: string; value: number | string; description: string; icon: LucideIcon; tone: AdminKpiTone }[] = [
    {
      title: "Total Routes",
      value: totalRoutes,
      description: "Saved collection routes",
      icon: Route,
      tone: "neutral",
    },
    {
      title: "Enabled Routes",
      value: activeRoutes,
      description:
        totalRoutes > 0
          ? `${Math.round((activeRoutes / totalRoutes) * 100)}% active operations`
          : "0 active",
      icon: CircleCheck,
      tone: "success",
    },
    {
      title: "Paused Routes",
      value: inactiveRoutes,
      description:
        totalRoutes > 0
          ? `${Math.round((inactiveRoutes / totalRoutes) * 100)}% inactive`
          : "0 paused",
      icon: PauseCircle,
      tone: "warning",
    },
    {
      title: "Barangays Covered",
      value:
        totalBarangays > 0
          ? `${coveredBarangays}/${totalBarangays}`
          : `${coveredBarangays}`,
      description: `${coveragePct}% municipal coverage`,
      icon: MapPin,
      tone: "info",
    },
  ];

  return (
    <AdminKpiGrid>
      {kpis.map((kpi) => (
        <AdminKpiCard
          key={kpi.title}
          label={kpi.title}
          value={kpi.value}
          description={kpi.description}
          icon={kpi.icon}
          tone={kpi.tone}
        />
      ))}
    </AdminKpiGrid>
  );
};

export default RouteKPIs;
