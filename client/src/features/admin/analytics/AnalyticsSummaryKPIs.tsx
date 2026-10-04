import type { ComponentProps } from "react";
import { CircleCheck, CircleX, ClipboardList, MapPin } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";
import { useAnalyticsData } from "./AnalyticsDataContext";

const Kpi = ({ value, suffix = "", ...props }: Omit<ComponentProps<typeof AdminKpiCard>, "value"> & { value: number; suffix?: string }) => {
  const animated = useCountUp(value);
  return <AdminKpiCard {...props} value={`${animated.toLocaleString()}${suffix}`} />;
};

const AnalyticsSummaryKPIs = () => {
  const { overview } = useAnalyticsData();
  return (
    <AdminKpiGrid>
      <Kpi label="Scheduled stops" value={overview.scheduledStops} description="Route stops this period" icon={MapPin} />
      <Kpi label="Collection rate" value={overview.completionRate} suffix="%" description={`${overview.completedStops} ${overview.completedStops === 1 ? "stop" : "stops"} completed`} icon={CircleCheck} tone="success" />
      <Kpi label="Missed stops" value={overview.missedStops} description="Requires collection follow-up" icon={CircleX} tone="danger" />
      <Kpi label="Open reports now" value={overview.openReports} description="Current queue awaiting resolution" icon={ClipboardList} tone="warning" />
    </AdminKpiGrid>
  );
};

export default AnalyticsSummaryKPIs;
