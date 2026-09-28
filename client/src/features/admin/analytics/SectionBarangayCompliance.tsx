import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Building2, CheckCircle2, CircleAlert } from "lucide-react";
import { useAnalyticsData } from "./AnalyticsDataContext";

const coverageConfig = { completed: { label: "Completed stops", color: "hsl(145, 58%, 31%)" }, missed: { label: "Missed stops", color: "hsl(13, 70%, 48%)" } };

const SectionBarangayCompliance: React.FC = () => {
  const { barangayCoverage } = useAnalyticsData();
  const highestCoverage = [...barangayCoverage].sort((a, b) => b.rate - a.rate).slice(0, 3);
  const followUp = [...barangayCoverage].sort((a, b) => b.missed - a.missed).slice(0, 3);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-foreground">Highest collection coverage</h3><p className="text-xs text-muted-foreground">Completed stops as a share of scheduled stops.</p></div></div>
          <div className="space-y-4">{highestCoverage.map((barangay, index) => <div key={barangay.name}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-foreground"><span className="mr-2 text-muted-foreground">{index + 1}</span>{barangay.name}</span><strong className="text-xs tabular-nums text-emerald-700 dark:text-emerald-300">{barangay.rate}%</strong></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${barangay.rate}%` }} /></div><p className="mt-1 text-[11px] text-muted-foreground">{barangay.completed} of {barangay.scheduled} scheduled stops completed</p></div>)}</div>
        </section>
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive"><CircleAlert className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-foreground">Barangays needing follow-up</h3><p className="text-xs text-muted-foreground">Areas with the most missed collection stops.</p></div></div>
          <div className="space-y-4">{followUp.map((barangay) => <div key={barangay.name}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-foreground">{barangay.name}</span><strong className="text-xs tabular-nums text-destructive">{barangay.missed} missed</strong></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-destructive" style={{ width: `${(barangay.missed / barangay.scheduled) * 100}%` }} /></div><p className="mt-1 text-[11px] text-muted-foreground">{barangay.completed} completed out of {barangay.scheduled} scheduled stops</p></div>)}</div>
        </section>
      </div>

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-foreground">Collection coverage by barangay</h3><p className="text-xs text-muted-foreground">Completed and missed stops for each barangay in the selected period.</p></div></div>
        <ChartContainer config={coverageConfig} className="h-[320px] w-full aspect-auto"><BarChart data={barangayCoverage} layout="vertical" margin={{ left: 104, right: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={98} fontSize={11} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="completed" stackId="stops" fill="var(--color-completed)" radius={[0, 0, 0, 0]} /><Bar dataKey="missed" stackId="stops" fill="var(--color-missed)" radius={[0, 5, 5, 0]} /></BarChart></ChartContainer>
      </section>
    </div>
  );
};

export default SectionBarangayCompliance;
