import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { barangayCompliance, barangayTrend } from "./mockData";
import { TrendingUp, AlertCircle, Building2, LineChart as LineChartIcon } from "lucide-react";

const barConfig = { rate: { label: "Compliance Rate", color: "hsl(145, 63%, 32%)" } };
const trendConfig = {
  "Malabanban Norte": { label: "Malabanban Norte", color: "hsl(145, 63%, 32%)" },
  Poblacion: { label: "Poblacion", color: "hsl(210, 60%, 50%)" },
  Dewey: { label: "Dewey", color: "hsl(0, 72%, 51%)" },
  Buenavista: { label: "Buenavista", color: "hsl(35, 90%, 55%)" },
};

const SectionBarangayCompliance: React.FC = () => {
  const top5 = barangayCompliance.slice(0, 5);
  const bottom5 = barangayCompliance.slice(-5).reverse();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top 5 & Bottom 5 Rankings */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Top 5 High Compliance */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Top 5 Compliant Barangays</h3>
                <p className="text-xs text-muted-foreground">Highest waste segregation & collection adherence</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              High
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {top5.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-primary w-5 text-center font-display">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{b.name}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{b.rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${b.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 Needing Improvement */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Needs Attention (Bottom 5)</h3>
                <p className="text-xs text-muted-foreground">Requires segregation monitoring & dispatch focus</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              Action Required
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {bottom5.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-muted-foreground w-5 text-center font-display">
                  #{barangayCompliance.length - i}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{b.name}</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{b.rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${b.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart - All 25 Barangays */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">All 25 Barangays — Compliance Rate Ranking</h3>
              <p className="text-xs text-muted-foreground">Comprehensive municipal segregation ranking</p>
            </div>
          </div>
        </div>

        <ChartContainer config={barConfig} className="h-[520px] w-full aspect-auto">
          <BarChart data={barangayCompliance} layout="vertical" margin={{ left: 125, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              domain={[0, 100]}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="rate" fill="var(--color-rate)" radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Multi-Month Trend Lines */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <LineChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Compliance Trend — Key Barangays (6-Month Historical)</h3>
              <p className="text-xs text-muted-foreground">Progress tracking across high-volume and rural sectors</p>
            </div>
          </div>
        </div>

        <ChartContainer config={trendConfig} className="h-[260px] w-full aspect-auto">
          <LineChart data={barangayTrend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[40, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="Malabanban Norte"
              stroke="hsl(145, 63%, 32%)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Poblacion"
              stroke="hsl(210, 60%, 50%)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Dewey"
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="Buenavista"
              stroke="hsl(35, 90%, 55%)"
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ChartContainer>

        <div className="flex flex-wrap justify-center gap-4 pt-1 border-t border-border/60">
          {Object.entries(trendConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
              <span className="text-foreground font-semibold">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionBarangayCompliance;
