import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { dailyCollectionRate, missedCollectionsWeekly, wasteTypeBreakdown, heatmapData } from "./mockData";

const lineConfig = { rate: { label: "Completion Rate", color: "hsl(145, 63%, 32%)" } };
const barConfig = { missed: { label: "Missed Collections", color: "hsl(35, 90%, 55%)" } };
const pieConfig = {
  Biodegradable: { label: "Biodegradable", color: "hsl(145, 63%, 32%)" },
  "Non-Biodegradable": { label: "Non-Biodegradable", color: "hsl(210, 60%, 50%)" },
};

const HeatmapCalendar = () => {
  const getColor = (rate: number) => {
    if (rate >= 90) return "bg-primary";
    if (rate >= 80) return "bg-primary/70";
    if (rate >= 70) return "bg-primary/40";
    if (rate >= 60) return "bg-yellow-500/60";
    return "bg-destructive/50";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Collection Heatmap — March 2026</CardTitle>
        <p className="text-xs text-muted-foreground">Daily completion rate at a glance</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>
          ))}
          {/* offset for March 2026 starts on Sunday */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {heatmapData.map((d) => (
            <div
              key={d.day}
              className={`aspect-square rounded-md ${getColor(d.rate)} flex items-center justify-center text-[10px] font-medium text-primary-foreground cursor-default transition-transform hover:scale-110`}
              title={`Mar ${d.day}: ${d.rate}%`}
            >
              {d.day}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 justify-center">
          {[
            { label: "≥90%", cls: "bg-primary" },
            { label: "80-89%", cls: "bg-primary/70" },
            { label: "70-79%", cls: "bg-primary/40" },
            { label: "60-69%", cls: "bg-yellow-500/60" },
            { label: "<60%", cls: "bg-destructive/50" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.cls}`} />
              {l.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SectionCollectionPerformance = () => {
  return (
    <div className="space-y-4">
      {/* Line chart - full width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily Collection Completion Rate</CardTitle>
          <p className="text-xs text-muted-foreground">Percentage of scheduled collections completed each day</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineConfig} className="h-[260px] w-full aspect-auto">
            <LineChart data={dailyCollectionRate}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval={2} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2.5} dot={{ r: 2, fill: "var(--color-rate)" }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 3-col grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Missed collections bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Missed Collections per Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[200px] w-full aspect-auto">
              <BarChart data={missedCollectionsWeekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="week" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="missed" fill="var(--color-missed)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Waste type pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Waste Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieConfig} className="h-[200px] w-full aspect-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={wasteTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))">
                  {wasteTypeBreakdown.map((e) => <Cell key={e.name} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              {wasteTypeBreakdown.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                  {d.name} ({d.value}%)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <HeatmapCalendar />
      </div>
    </div>
  );
};

export default SectionCollectionPerformance;
