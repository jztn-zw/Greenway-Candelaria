import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useAnalyticsData } from "./AnalyticsDataContext";
import { reportStatusColors } from "./analytics.types";
import { AlertTriangle, Clock, PieChart as PieIcon, TrendingUp, MapPin } from "lucide-react";

const lineConfig = { reports: { label: "Reports", color: "hsl(210, 60%, 50%)" } };
const barConfig = { days: { label: "Avg Days", color: "hsl(35, 90%, 55%)" } };
const brgyConfig = { reports: { label: "Reports", color: "hsl(0, 72%, 51%)" } };
const pieConfig = {
  Submitted: { label: "Submitted", color: "hsl(35, 90%, 55%)" },
  "Under Review": { label: "Under Review", color: "hsl(210, 70%, 55%)" },
  Dispatched: { label: "Dispatched", color: "hsl(270, 50%, 55%)" },
  Resolved: { label: "Resolved", color: "hsl(145, 63%, 32%)" },
};

const SectionWasteReports: React.FC = () => {
  const { reportsPerWeek, reportStatusBreakdown, resolutionTimeMonthly, violationTypes, reportsByBarangay } = useAnalyticsData();
  const maxViolation = violationTypes[0]?.count || 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Reports Volume & Status Breakdown */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Weekly Report Volume */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Incident Reports per Week</h3>
              <p className="text-xs text-muted-foreground">Total citizen-submitted report intake</p>
            </div>
          </div>

          <ChartContainer config={lineConfig} className="h-[220px] w-full aspect-auto">
            <LineChart data={reportsPerWeek}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="period" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="reports"
                stroke="var(--color-reports)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-reports)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </div>

        {/* Report Status Distribution */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Report Lifecycle Distribution</h3>
              <p className="text-xs text-muted-foreground">Active triage, dispatch, and resolved status</p>
            </div>
          </div>

          <ChartContainer config={pieConfig} className="h-[220px] w-full aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={reportStatusBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {reportStatusBreakdown.map((e) => (
                  <Cell key={e.name} fill={reportStatusColors[e.name]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 pt-1 border-t border-border/60">
            {reportStatusBreakdown.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: reportStatusColors[d.name] }} />
                <span>{d.name}</span>
                <span className="font-bold text-foreground">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolution Time & Common Violations */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Monthly Turnaround Time */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Average resolution time</h3>
              <p className="text-xs text-muted-foreground">Time from report submission to resolution</p>
            </div>
          </div>

          <ChartContainer config={barConfig} className="h-[220px] w-full aspect-auto">
            <BarChart data={resolutionTimeMonthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="days" fill="var(--color-days)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Most Common Violations */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Report categories</h3>
              <p className="text-xs text-muted-foreground">Most common issues submitted by residents</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {violationTypes.map((v, i) => (
              <div key={v.type} className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-muted-foreground w-4 text-center font-display">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{v.type}</span>
                    <span className="text-xs font-bold text-destructive tabular-nums">{v.count} reports</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${(v.count / maxViolation) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {violationTypes.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No resident reports were submitted in this period.</p>}
          </div>
        </div>
      </div>

      {/* Reports by Barangay */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Reports by barangay</h3>
            <p className="text-xs text-muted-foreground">Barangays with the highest report volume in this period</p>
          </div>
        </div>

        <ChartContainer config={brgyConfig} className="h-[300px] w-full aspect-auto">
          <BarChart data={reportsByBarangay} layout="vertical" margin={{ left: 90, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={85} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="reports" fill="var(--color-reports)" radius={[0, 6, 6, 0]} barSize={16} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
};

export default SectionWasteReports;
