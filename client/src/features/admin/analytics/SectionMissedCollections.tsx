import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AlertTriangle, MapPin, MessageSquareWarning } from "lucide-react";
import { useAnalyticsData } from "./AnalyticsDataContext";

const weeklyConfig = { missed: { label: "Missed stops", color: "hsl(13, 70%, 48%)" } };
const areaConfig = { missed: { label: "Missed stops", color: "hsl(13, 70%, 48%)" } };
const reasonColors = ["hsl(13, 70%, 48%)", "hsl(35, 82%, 52%)", "hsl(204, 62%, 48%)", "hsl(145, 58%, 31%)"];

const SectionMissedCollections: React.FC = () => {
  const { missedByArea, missedCollectionsWeekly, missedReasons } = useAnalyticsData();
  const totalMissed = missedCollectionsWeekly.reduce((sum, week) => sum + week.missed, 0);
  const topArea = missedByArea[0];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Missed stops by week</h3>
                <p className="text-xs text-muted-foreground">A stop marked missed after a route ends or is skipped.</p>
              </div>
            </div>
            <span className="shrink-0 text-2xl font-bold tabular-nums text-destructive">{totalMissed}</span>
          </div>
          <ChartContainer config={weeklyConfig} className="h-[230px] w-full aspect-auto">
            <BarChart data={missedCollectionsWeekly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="period" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="missed" fill="var(--color-missed)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Areas needing follow-up</h3>
              <p className="text-xs text-muted-foreground">Stops missed within the selected period.</p>
            </div>
          </div>
          <ChartContainer config={areaConfig} className="h-[230px] w-full aspect-auto">
            <BarChart data={missedByArea} layout="vertical" margin={{ left: 92, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={86} fontSize={11} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="missed" fill="var(--color-missed)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
          <p className="mt-3 text-xs text-muted-foreground">{topArea ? <><span className="font-semibold text-foreground">{topArea.name}</span> has the most missed stops in this period.</> : "No missed stops were recorded in this period."}</p>
        </section>
      </div>

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <MessageSquareWarning className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Recorded skip reasons</h3>
            <p className="text-xs text-muted-foreground">Reasons saved when a driver marks a route stop as missed.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {missedReasons.map((item, index) => (
            <article key={item.reason} className="rounded-xl bg-muted/45 p-4">
              <div className="mb-5 h-1.5 w-12 rounded-full" style={{ background: reasonColors[index] }} />
              <p className="text-2xl font-bold tabular-nums text-foreground">{item.count}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>
            </article>
          ))}
          {missedReasons.length === 0 && <p className="col-span-full py-5 text-center text-sm text-muted-foreground">No missed-stop reasons were recorded in this period.</p>}
        </div>
      </section>
    </div>
  );
};

export default SectionMissedCollections;
