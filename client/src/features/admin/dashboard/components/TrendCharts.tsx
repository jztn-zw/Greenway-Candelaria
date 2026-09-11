import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { ReportsAnalytics, UsersAnalytics } from "./useAdminDashboard";

const lineConfig = {
  reports: { label: "Reports", color: "hsl(145, 63%, 32%)" },
};
const barConfig = {
  residents: { label: "Residents", color: "hsl(145, 63%, 32%)" },
};
const pieConfig = {
  Resolved: { label: "Resolved", color: "hsl(145, 63%, 38%)" },
  "Under Review": { label: "Under Review", color: "hsl(210, 70%, 55%)" },
  Dispatched: { label: "Dispatched", color: "hsl(270, 50%, 55%)" },
  Pending: { label: "Pending", color: "hsl(35, 90%, 52%)" },
};

// Generate continuous 6-month rolling window (e.g. Mar -> Aug)
const getLast6Months = () => {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    months.push({ key, label });
  }
  return months;
};

interface TrendChartsProps {
  reportsAnalytics?: ReportsAnalytics | null;
  usersAnalytics?: UsersAnalytics | null;
}

const TrendCharts = ({ reportsAnalytics, usersAnalytics }: TrendChartsProps) => {
  const last6 = getLast6Months();

  // 1. Continuous 6-month report volume data
  const reportTrendData = last6.map(({ key, label }) => {
    const match = (reportsAnalytics?.monthly_trend ?? []).find(
      (m) => m.month === key
    );
    return {
      period: label,
      reports: match ? Number(match.count) || 0 : 0,
    };
  });

  // 2. Structured 4-status distribution (always balanced 2x2 grid)
  const statusCounts: Record<string, number> = {
    Pending: 0,
    "Under Review": 0,
    Dispatched: 0,
    Resolved: 0,
  };

  (reportsAnalytics?.by_status ?? []).forEach((item) => {
    const upper = (item.status || "").toUpperCase();
    const count = Number(item.count) || 0;
    if (upper === "RESOLVED") statusCounts["Resolved"] += count;
    else if (upper === "UNDER_REVIEW") statusCounts["Under Review"] += count;
    else if (upper === "DISPATCHED") statusCounts["Dispatched"] += count;
    else statusCounts["Pending"] += count;
  });

  const reportStatusData = [
    { name: "Pending", value: statusCounts["Pending"], fill: "hsl(35, 90%, 52%)" },
    { name: "Under Review", value: statusCounts["Under Review"], fill: "hsl(210, 70%, 55%)" },
    { name: "Dispatched", value: statusCounts["Dispatched"], fill: "hsl(270, 50%, 55%)" },
    { name: "Resolved", value: statusCounts["Resolved"], fill: "hsl(145, 63%, 38%)" },
  ];

  const totalReportsCount =
    reportsAnalytics?.total ??
    reportStatusData.reduce((acc, curr) => acc + curr.value, 0);

  // 3. Continuous 6-month resident registration data
  const growthData = last6.map(({ key, label }) => {
    const match = (usersAnalytics?.monthly_signups ?? []).find(
      (m) => m.month === key
    );
    return {
      month: label,
      residents: match ? Number(match.count) || 0 : 0,
    };
  });

  const currentMonthLabel = last6[last6.length - 1]?.label || "Month";
  const thisMonthNewResidents = growthData[growthData.length - 1]?.residents || 0;
  const resolutionRateText = reportsAnalytics?.resolution_rate || "0%";

  return (
    <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-3">
      {/* ── 1. Report Volume Trend (Continuous Area Chart) ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">
                Report Volume Trend
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                6-Month incident volume
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
              6-Mo Rolling
            </span>
          </div>

          <ChartContainer
            config={lineConfig}
            className="h-[185px] w-full aspect-auto pt-2"
          >
            <AreaChart data={reportTrendData}>
              <defs>
                <linearGradient id="emeraldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(145, 63%, 32%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(145, 63%, 32%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="period"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{
                  stroke: "hsl(145, 63%, 32%)",
                  strokeWidth: 1.5,
                  strokeDasharray: "4 4",
                }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                type="monotone"
                dataKey="reports"
                stroke="hsl(145, 63%, 32%)"
                strokeWidth={2.5}
                fill="url(#emeraldArea)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </div>

      {/* ── 2. Reports by Status (Donut Chart + Symmetrical 2x2 Grid) ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">
                Reports by Status
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Resolution distribution
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
              Live Breakdown
            </span>
          </div>

          <ChartContainer
            config={pieConfig}
            className="h-[145px] w-full aspect-auto relative"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Pie
                data={reportStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={3}
              >
                {reportStatusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <text
                x="50%"
                y="46%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xl font-extrabold fill-foreground font-display"
              >
                {totalReportsCount}
              </text>
              <text
                x="50%"
                y="61%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] font-bold fill-muted-foreground uppercase tracking-wider"
              >
                Reports
              </text>
            </PieChart>
          </ChartContainer>

          {/* Symmetrical 2x2 Status Key */}
          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border/60">
            {reportStatusData.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-muted/40 border border-border/50 text-[11px]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                    style={{ background: d.fill }}
                  />
                  <span className="text-muted-foreground truncate">{d.name}</span>
                </div>
                <span className="font-bold text-foreground tabular-nums ml-1">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Resident Community (Continuous Bar Chart with Clean Hover) ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground font-display">
                Resident Community
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monthly registered users
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 tabular-nums">
              +{thisMonthNewResidents} in {currentMonthLabel}
            </span>
          </div>

          <ChartContainer
            config={barConfig}
            className="h-[185px] w-full aspect-auto pt-2"
          >
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="month"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar
                dataKey="residents"
                fill="hsl(145, 63%, 32%)"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
                className="transition-opacity hover:opacity-85"
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;
