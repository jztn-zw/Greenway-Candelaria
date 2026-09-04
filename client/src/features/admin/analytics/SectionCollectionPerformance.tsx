import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { dailyCollectionRate, missedCollectionsWeekly, wasteTypeBreakdown, heatmapData } from "./mockData";
import { TrendingUp, AlertTriangle, PieChart as PieIcon, CalendarDays } from "lucide-react";

const lineConfig = { rate: { label: "Completion Rate", color: "hsl(145, 63%, 32%)" } };
const barConfig = { missed: { label: "Missed Collections", color: "hsl(35, 90%, 55%)" } };
const pieConfig = {
  Biodegradable: { label: "Biodegradable", color: "hsl(145, 63%, 32%)" },
  "Non-Biodegradable": { label: "Non-Biodegradable", color: "hsl(210, 60%, 50%)" },
};

const HeatmapCalendar: React.FC = () => {
  const getColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-600 dark:bg-emerald-500 text-white";
    if (rate >= 80) return "bg-primary text-primary-foreground";
    if (rate >= 70) return "bg-primary/50 text-primary-foreground";
    if (rate >= 60) return "bg-amber-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Collection Heatmap</h3>
            <p className="text-[11px] text-muted-foreground">March 2026 daily completion rates</p>
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-wider">{d}</div>
          ))}
          {/* Offset for March 2026 starting on Sunday */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {heatmapData.map((d) => (
            <div
              key={d.day}
              className={`aspect-square rounded-xl ${getColor(d.rate)} flex items-center justify-center text-[10px] font-bold shadow-2xs cursor-default transition-all duration-150 hover:scale-110`}
              title={`March ${d.day}, 2026: ${d.rate}% completion`}
            >
              {d.day}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-4 justify-center pt-2 border-t border-border/60">
          {[
            { label: "≥90%", cls: "bg-emerald-600 dark:bg-emerald-500" },
            { label: "80-89%", cls: "bg-primary" },
            { label: "70-79%", cls: "bg-primary/50" },
            { label: "60-69%", cls: "bg-amber-500" },
            { label: "<60%", cls: "bg-destructive" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <span className={`w-2 h-2 rounded-full ${l.cls}`} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SectionCollectionPerformance: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Line chart - Daily completion */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Daily Collection Completion Rate</h3>
              <p className="text-xs text-muted-foreground">Percentage of scheduled barangay stops completed on time</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              87% Avg
            </span>
          </div>
        </div>

        <ChartContainer config={lineConfig} className="h-[260px] w-full aspect-auto">
          <LineChart data={dailyCollectionRate}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval={2} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--color-rate)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-rate)" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* 3-col Grid */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-3">
        {/* Missed collections bar chart */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Missed Collections</h3>
              <p className="text-xs text-muted-foreground">Weekly missed stop occurrences</p>
            </div>
          </div>

          <ChartContainer config={barConfig} className="h-[200px] w-full aspect-auto">
            <BarChart data={missedCollectionsWeekly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="week" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="missed" fill="var(--color-missed)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Waste type breakdown pie */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Waste Type Breakdown</h3>
              <p className="text-xs text-muted-foreground">Biodegradable vs Non-Biodegradable</p>
            </div>
          </div>

          <ChartContainer config={pieConfig} className="h-[200px] w-full aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={wasteTypeBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {wasteTypeBreakdown.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex justify-center gap-4 pt-1">
            {wasteTypeBreakdown.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                <span>{d.name}</span>
                <span className="font-bold text-foreground">({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap calendar */}
        <HeatmapCalendar />
      </div>
    </div>
  );
};

export default SectionCollectionPerformance;
