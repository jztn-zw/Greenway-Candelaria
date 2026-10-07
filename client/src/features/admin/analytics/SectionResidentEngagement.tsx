import React from "react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BellRing, FileText, TrendingUp, UserPlus, Users } from "lucide-react";
import { useAnalyticsData } from "./AnalyticsDataContext";

const registrationConfig = { registrations: { label: "New Residents", color: "hsl(var(--chart-1))" } };
const participationConfig = { residents: { label: "Residents Reporting", color: "hsl(var(--info))" }, reports: { label: "Reports Submitted", color: "hsl(var(--chart-1))" } };

const SectionResidentEngagement: React.FC = () => {
  const { residentParticipation, residentRegistrationGrowth, residentSummary } = useAnalyticsData();
  return (
  <div className="space-y-4 sm:space-y-5">
    <AdminKpiGrid>
      <AdminKpiCard label="Total Residents" value={residentSummary.total} description="Registered resident accounts" icon={Users} />
      <AdminKpiCard label="New Residents" value={residentSummary.newResidents} description="Registered in the selected period" icon={UserPlus} tone="success" />
      <AdminKpiCard label="Residents Reporting" value={residentSummary.reportingResidents} description="Distinct resident reporters" icon={FileText} tone="info" />
      <AdminKpiCard label="Announcement Reads" value={residentSummary.announcementReads} description="Recorded announcement reads" icon={BellRing} tone="warning" />
    </AdminKpiGrid>

    <div className="analytics-grid grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      <section className="analytics-card rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><TrendingUp className="h-4 w-4" /></div><div><h3 className="gw-heading text-sm text-foreground">New Resident Registrations</h3><p className="text-xs text-muted-foreground">New accounts registered each month.</p></div></div>
        <ChartContainer config={registrationConfig} className="h-[240px] w-full aspect-auto"><BarChart data={residentRegistrationGrowth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="registrations" fill="var(--color-registrations)" radius={[6, 6, 0, 0]} /></BarChart></ChartContainer>
      </section>

      <section className="analytics-card rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"><FileText className="h-4 w-4" /></div><div><h3 className="gw-heading text-sm text-foreground">Resident Reporting Participation</h3><p className="text-xs text-muted-foreground">Unique residents who submitted reports and the reports submitted.</p></div></div>
        <ChartContainer config={participationConfig} className="h-[240px] w-full aspect-auto"><LineChart data={residentParticipation}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="residents" stroke="var(--color-residents)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-residents)" }} /><Line type="monotone" dataKey="reports" stroke="var(--color-reports)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-reports)" }} /></LineChart></ChartContainer>
      </section>
    </div>
  </div>
  );
};

export default SectionResidentEngagement;
