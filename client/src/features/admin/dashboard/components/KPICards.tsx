import { CircleCheck, FileText, Truck, Users } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid, type AdminKpiTone } from "@/components/admin/AdminKpiCards";
import { useCountUp } from "./useCountUp";
import type { AnalyticsOverview, ReportsAnalytics } from "./useAdminDashboard";

interface KPISegmentProps {
  label: string;
  value: number;
  suffix?: string;
  subtitle: string;
  icon: typeof FileText;
  tone: AdminKpiTone;
}

const KPISegment = ({ label, value, suffix = "", subtitle, icon, tone }: KPISegmentProps) => {
  const animated = useCountUp(value);
  return <AdminKpiCard label={label} value={`${animated.toLocaleString()}${suffix}`} description={subtitle} icon={icon} tone={tone} />;
};

interface KPICardsProps {
  overview?: AnalyticsOverview | null;
  reportsAnalytics?: ReportsAnalytics | null;
}

const KPICards = ({ overview, reportsAnalytics }: KPICardsProps) => {
  const totalReports = overview?.reports?.total ?? reportsAnalytics?.total ?? 0;
  const resolvedReports = overview?.reports?.resolved ?? reportsAnalytics?.resolved ?? 0;
  const rawResolutionRate = reportsAnalytics?.resolution_rate
    ? parseFloat(reportsAnalytics.resolution_rate.replace("%", ""))
    : (totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0);
  const activeTrucks = overview?.trucks?.active ?? 0;
  const totalTrucks = overview?.trucks?.total ?? 0;
  const totalResidents = overview?.users?.residents ?? 0;

  const kpis: KPISegmentProps[] = [
    { label: "Total Reports", value: totalReports, subtitle: "Incidents logged", icon: FileText, tone: "neutral" },
    { label: "Resolution Rate", value: Math.round(rawResolutionRate), suffix: "%", subtitle: `${resolvedReports} resolved cases`, icon: CircleCheck, tone: "success" },
    { label: "Available Fleet", value: activeTrucks, subtitle: `${totalTrucks} registered trucks · not under maintenance`, icon: Truck, tone: "success" },
    { label: "Registered Residents", value: totalResidents, subtitle: "Resident accounts, including inactive", icon: Users, tone: "neutral" },
  ];

  return <AdminKpiGrid>{kpis.map((kpi) => <KPISegment key={kpi.label} {...kpi} />)}</AdminKpiGrid>;
};

export default KPICards;
