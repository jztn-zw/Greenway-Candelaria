import React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CheckCircle2, Route, UsersRound } from "lucide-react";
import { useAnalyticsData } from "./AnalyticsDataContext";
import { withDriverChartLabels } from "./analytics.utils";

const trendConfig = { rate: { label: "Completion rate", color: "hsl(145, 58%, 31%)" } };
const driverConfig = { completedStops: { label: "Completed stops", color: "hsl(145, 58%, 31%)" }, missedStops: { label: "Missed stops", color: "hsl(13, 70%, 48%)" } };

const SectionCollectionPerformance: React.FC = () => {
  const { collectionCompletionTrend, driverOperations, overview } = useAnalyticsData();
  const driverChartRows = withDriverChartLabels(driverOperations);
  return (
  <div className="space-y-4 sm:space-y-5">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-foreground">Collection rate over time</h3><p className="text-xs text-muted-foreground">Completed stops divided by scheduled stops.</p></div></div>
          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{overview.completionRate}% overall</span>
        </div>
        <ChartContainer config={trendConfig} className="h-[260px] w-full aspect-auto"><LineChart data={collectionCompletionTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="period" fontSize={10} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} /><ChartTooltip content={<ChartTooltipContent />} /><ReferenceLine y={90} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" /><Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-rate)" }} activeDot={{ r: 5 }} /></LineChart></ChartContainer>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Route className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-foreground">Scheduled stop outcomes</h3><p className="text-xs text-muted-foreground">This period’s route-stop results.</p></div></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/45 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled</p><p className="mt-3 text-3xl font-bold tabular-nums text-foreground">{overview.scheduledStops}</p><p className="mt-1 text-xs text-muted-foreground">Route stops</p></div>
          <div className="rounded-xl bg-emerald-500/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Completed</p><p className="mt-3 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{overview.completedStops}</p><p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">Route stops</p></div>
          <div className="rounded-xl bg-destructive/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Missed</p><p className="mt-3 text-3xl font-bold tabular-nums text-destructive">{overview.missedStops}</p><p className="mt-1 text-xs text-destructive/80">Route stops</p></div>
        </div>
        <p className="mt-5 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground">A missed stop is recorded when a route stop is skipped or remains unfinished when the driver ends the route.</p>
      </section>
    </div>

    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
      <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><UsersRound className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-foreground">Collection performance by driver</h3><p className="text-xs text-muted-foreground">Completed and missed stops from routes assigned to each driver.</p></div></div>
      {driverChartRows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No driver route stops match this period and barangay.</p>
      ) : (
        <div className="overflow-x-auto"><ChartContainer config={driverConfig} className="h-[260px] min-w-[520px] w-full aspect-auto" style={{ minWidth: Math.max(520, driverChartRows.length * 110) }}><BarChart data={driverChartRows} margin={{ left: 12, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} interval={0} /><YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="completedStops" stackId="stops" fill="var(--color-completedStops)" radius={[0, 0, 0, 0]} /><Bar dataKey="missedStops" stackId="stops" fill="var(--color-missedStops)" radius={[5, 5, 0, 0]} /></BarChart></ChartContainer></div>
      )}
    </section>
  </div>
  );
};

export default SectionCollectionPerformance;
