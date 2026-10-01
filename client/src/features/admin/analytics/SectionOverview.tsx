import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CheckCircle2, ClipboardList, FileWarning, Truck } from "lucide-react";
import { useAnalyticsData } from "./AnalyticsDataContext";
import { reportStatusColors } from "./analytics.types";

const collectionConfig = { rate: { label: "Completion rate", color: "hsl(var(--chart-1))" } };
const reportConfig = {
  Submitted: { label: "Submitted", color: "hsl(var(--warning))" },
  "Under Review": { label: "Under Review", color: "hsl(var(--info))" },
  Dispatched: { label: "Dispatched", color: "hsl(var(--chart-3))" },
  Resolved: { label: "Resolved", color: "hsl(var(--chart-1))" },
};
const fleetConfig = { completed: { label: "Completed routes", color: "hsl(var(--chart-1))" }, incomplete: { label: "Incomplete routes", color: "hsl(var(--warning))" }, missedRoutes: { label: "Missed routes", color: "hsl(var(--error))" } };

const SectionOverview: React.FC = () => {
  const { collectionCompletionTrend, fleetStatus, overview, reportStatusBreakdown } = useAnalyticsData();
  const maintenanceTrucks = fleetStatus.filter((truck) => truck.availability === "Under maintenance").length;
  const hasFleetOutcomes = fleetStatus.some((truck) => truck.completed + truck.incomplete + truck.missedRoutes > 0);
  const reportTotal = reportStatusBreakdown.reduce((total, status) => total + status.value, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><CheckCircle2 className="h-4 w-4" /></div>
              <div><h3 className="gw-heading text-sm text-foreground">Collection completion trend</h3><p className="text-xs text-muted-foreground">Completed stops ÷ scheduled stops by week.</p></div>
            </div>
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{overview.completionRate}%</span>
          </div>
          <ChartContainer config={collectionConfig} className="h-[230px] w-full aspect-auto">
            <LineChart data={collectionCompletionTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="period" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={90} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-rate)" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartContainer>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"><ClipboardList className="h-4 w-4" /></div>
              <div><h3 className="gw-heading text-sm text-foreground">Incident report status</h3><p className="text-xs text-muted-foreground">Current status of reports submitted in the selected period.</p></div>
            </div>
            <span className="gw-stat-value text-2xl tabular-nums text-foreground">{reportTotal.toLocaleString()}</span>
          </div>
          <ChartContainer config={reportConfig} className="h-[200px] w-full aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={reportStatusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={77} paddingAngle={3} stroke="hsl(var(--card))" strokeWidth={2}>
                {reportStatusBreakdown.map((status) => <Cell key={status.name} fill={reportStatusColors[status.name]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 border-t border-border/60 pt-3">
            {reportStatusBreakdown.map((status) => <span key={status.name} className="flex items-center gap-1.5 text-ui-caption text-muted-foreground"><i className="h-2 w-2 rounded-full" style={{ background: reportStatusColors[status.name] }} /><span>{status.name}</span><b className="tabular-nums text-foreground">{status.value}</b></span>)}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="mb-4 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive"><FileWarning className="h-4 w-4" /></div><div><h3 className="gw-heading text-sm text-foreground">Needs attention</h3><p className="text-xs text-muted-foreground">Items an administrator can review first.</p></div></div>
          <div className="divide-y divide-border/60 rounded-xl bg-muted/35 px-4">
            <div className="flex items-center justify-between gap-4 py-3"><span className="text-xs text-foreground">Missed collection stops</span><strong className="text-sm tabular-nums text-destructive">{overview.missedStops}</strong></div>
            <div className="flex items-center justify-between gap-4 py-3"><span className="text-xs text-foreground">Reports awaiting action</span><strong className="text-sm tabular-nums text-amber-700 dark:text-amber-300">{overview.openReports}</strong></div>
            <div className="flex items-center justify-between gap-4 py-3"><span className="text-xs text-foreground">Trucks under maintenance</span><strong className="text-sm text-foreground">{maintenanceTrucks}</strong></div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Truck className="h-4 w-4" /></div><div><h3 className="gw-heading text-sm text-foreground">Fleet route outcomes</h3><p className="text-xs text-muted-foreground">Completed, incomplete, and missed routes by truck.</p></div></div><span className="text-xs font-semibold text-muted-foreground">{overview.activeTrucks} of {overview.totalTrucks} collecting</span></div>
          {hasFleetOutcomes ? (
            <ChartContainer config={fleetConfig} className="h-[150px] w-full aspect-auto"><BarChart data={fleetStatus}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="plate" fontSize={10} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="completed" stackId="routes" fill="var(--color-completed)" /><Bar dataKey="incomplete" stackId="routes" fill="var(--color-incomplete)" /><Bar dataKey="missedRoutes" stackId="routes" fill="var(--color-missedRoutes)" /></BarChart></ChartContainer>
          ) : (
            <p className="flex h-[150px] items-center justify-center text-center text-xs text-muted-foreground">No routes have closed with these outcomes in the selected period.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default SectionOverview;
