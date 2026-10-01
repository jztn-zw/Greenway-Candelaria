import React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BellRing, FileText, TrendingUp, UserPlus, Users } from "lucide-react";
import { useAnalyticsData } from "./AnalyticsDataContext";

const registrationConfig = { registrations: { label: "New residents", color: "hsl(var(--chart-1))" } };
const participationConfig = { residents: { label: "Residents reporting", color: "hsl(var(--info))" }, reports: { label: "Reports submitted", color: "hsl(var(--chart-1))" } };

const ResidentMetric = ({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: React.ElementType; tone: string }) => (
  <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
    <div className="flex items-center justify-between gap-3"><span className="text-ui-overline font-bold uppercase tracking-wider text-muted-foreground">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span></div>
    <p className="gw-stat-value mt-5 text-3xl tabular-nums tracking-tight text-foreground">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
  </article>
);

const SectionResidentEngagement: React.FC = () => {
  const { residentParticipation, residentRegistrationGrowth, residentSummary } = useAnalyticsData();
  return (
  <div className="space-y-4 sm:space-y-5">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <ResidentMetric label="Total residents" value={residentSummary.total.toLocaleString()} helper="Registered resident accounts" icon={Users} tone="bg-primary/10 text-primary" />
      <ResidentMetric label="New residents" value={residentSummary.newResidents.toLocaleString()} helper="Registered in the selected period" icon={UserPlus} tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" />
      <ResidentMetric label="Residents reporting" value={residentSummary.reportingResidents.toLocaleString()} helper="Distinct resident reporters" icon={FileText} tone="bg-sky-500/10 text-sky-700 dark:text-sky-300" />
      <ResidentMetric label="Announcement reads" value={residentSummary.announcementReads.toLocaleString()} helper="Recorded announcement reads" icon={BellRing} tone="bg-amber-500/10 text-amber-700 dark:text-amber-300" />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><TrendingUp className="h-4 w-4" /></div><div><h3 className="gw-heading text-sm text-foreground">New resident registrations</h3><p className="text-xs text-muted-foreground">New accounts registered each month.</p></div></div>
        <ChartContainer config={registrationConfig} className="h-[240px] w-full aspect-auto"><BarChart data={residentRegistrationGrowth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="registrations" fill="var(--color-registrations)" radius={[6, 6, 0, 0]} /></BarChart></ChartContainer>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"><FileText className="h-4 w-4" /></div><div><h3 className="gw-heading text-sm text-foreground">Resident reporting participation</h3><p className="text-xs text-muted-foreground">Unique residents who submitted reports and the reports submitted.</p></div></div>
        <ChartContainer config={participationConfig} className="h-[240px] w-full aspect-auto"><LineChart data={residentParticipation}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="residents" stroke="var(--color-residents)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-residents)" }} /><Line type="monotone" dataKey="reports" stroke="var(--color-reports)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-reports)" }} /></LineChart></ChartContainer>
      </section>
    </div>
  </div>
  );
};

export default SectionResidentEngagement;
