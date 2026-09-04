import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ReferenceLine } from "recharts";
import {
  dailyCollectionRate,
  reportStatusBreakdown,
  barangayCompliance,
  truckUtilization,
  wasteTypeBreakdown,
} from "./mockData";
import {
  TrendingUp,
  PieChart as PieIcon,
  Building2,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from "lucide-react";

const lineConfig = { rate: { label: "Completion Rate (%)", color: "hsl(145, 63%, 32%)" } };
const pieConfig = {
  Submitted: { label: "Submitted", color: "hsl(35, 90%, 55%)" },
  "Under Review": { label: "Under Review", color: "hsl(210, 70%, 55%)" },
  Dispatched: { label: "Dispatched", color: "hsl(270, 50%, 55%)" },
  Resolved: { label: "Resolved", color: "hsl(145, 63%, 32%)" },
};

const SectionOverview: React.FC = () => {
  const top3 = barangayCompliance.slice(0, 3);
  const bottom3 = barangayCompliance.slice(-3).reverse();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Top Row: Collection Curve & Report Lifecycle ── */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Collection Efficiency Curve */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Collection Efficiency Trend</h3>
                <p className="text-xs text-muted-foreground">Daily completion rate vs 90% municipal benchmark</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              87% Avg
            </span>
          </div>

          <ChartContainer config={lineConfig} className="h-[220px] w-full aspect-auto">
            <LineChart data={dailyCollectionRate.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={90} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--color-rate)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-rate)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Actual Daily Route Completion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-muted-foreground border border-dashed" />
              <span>90% Standard Target</span>
            </div>
          </div>
        </div>

        {/* Incident Resolution Breakdown */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Incident Resolution Distribution</h3>
                <p className="text-xs text-muted-foreground">Citizen report status breakdown across all 25 barangays</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              69 Total
            </span>
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
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex flex-wrap justify-center gap-3 pt-2 border-t border-border/60">
            {reportStatusBreakdown.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                <span>{d.name}</span>
                <span className="font-bold text-foreground">({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Barangay Leaders & Fleet Status ── */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Barangay Compliance Leaders & Hotspots */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Barangay Compliance Highlights</h3>
              <p className="text-xs text-muted-foreground">Top-performing sectors and areas needing MENRO support</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {/* Top 3 Compliant */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Top Compliant Barangays</span>
              </div>
              {top3.map((b, i) => (
                <div key={b.name} className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-muted-foreground w-4 font-display">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-foreground truncate">{b.name}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{b.rate}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${b.rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom 3 Needing Attention */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Priority Attention Areas</span>
              </div>
              {bottom3.map((b, i) => (
                <div key={b.name} className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-muted-foreground w-4 font-display">#{barangayCompliance.length - i}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-foreground truncate">{b.name}</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{b.rate}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${b.rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fleet Readiness & Segregation Profile */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Fleet & Municipal Operations Snapshot</h3>
              <p className="text-xs text-muted-foreground">Active vehicle readiness and waste composition</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="bg-muted/40 border border-border/60 rounded-xl p-3 text-center space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fleet Active</span>
              <div className="text-2xl font-bold font-display text-foreground">4 / 5</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">80% In Service</span>
            </div>
            <div className="bg-muted/40 border border-border/60 rounded-xl p-3 text-center space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On-Time Dispatches</span>
              <div className="text-2xl font-bold font-display text-foreground">91.5%</div>
              <span className="text-[11px] text-primary font-medium">Schedule Adherence</span>
            </div>
          </div>

          {/* Waste Composition Meter */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Municipal Waste Composition</span>
              <span className="text-muted-foreground">{wasteTypeBreakdown[0].value}% Bio / {wasteTypeBreakdown[1].value}% Non-Bio</span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${wasteTypeBreakdown[0].value}%` }}
                title="Biodegradable"
              />
              <div
                className="h-full bg-sky-600 transition-all duration-500"
                style={{ width: `${wasteTypeBreakdown[1].value}%` }}
                title="Non-Biodegradable"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Biodegradable ({wasteTypeBreakdown[0].value}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-600" />
                <span>Non-Biodegradable ({wasteTypeBreakdown[1].value}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionOverview;
