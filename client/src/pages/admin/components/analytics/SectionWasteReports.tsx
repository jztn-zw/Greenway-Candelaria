import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { reportsPerWeek, reportStatusBreakdown, resolutionTimeMonthly, violationTypes, reportsByBarangay } from "./mockData";
import { AlertTriangle } from "lucide-react";

const lineConfig = { reports: { label: "Reports", color: "hsl(210, 60%, 50%)" } };
const barConfig = { days: { label: "Avg Days", color: "hsl(35, 90%, 55%)" } };
const brgyConfig = { reports: { label: "Reports", color: "hsl(0, 72%, 51%)" } };
const pieConfig = {
  Submitted: { label: "Submitted", color: "hsl(35, 90%, 55%)" },
  "Under Review": { label: "Under Review", color: "hsl(210, 70%, 55%)" },
  Dispatched: { label: "Dispatched", color: "hsl(270, 50%, 55%)" },
  Resolved: { label: "Resolved", color: "hsl(145, 63%, 32%)" },
};

const SectionWasteReports = () => {
  const maxViolation = violationTypes[0].count;

  return (
    <div className="space-y-4">
      {/* Reports volume + Status donut */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Reports Submitted per Week</CardTitle>
            <p className="text-xs text-muted-foreground">Total report volume over time</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={lineConfig} className="h-[220px] w-full aspect-auto">
              <LineChart data={reportsPerWeek}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="week" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="reports" stroke="var(--color-reports)" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Report Status Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Current distribution of all reports</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieConfig} className="h-[220px] w-full aspect-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={reportStatusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={2} stroke="hsl(var(--card))">
                  {reportStatusBreakdown.map((e) => <Cell key={e.name} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {reportStatusBreakdown.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution time + Violation ranking */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Avg Resolution Time (Days)</CardTitle>
            <p className="text-xs text-muted-foreground">Monthly trend of how fast reports are resolved</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[220px] w-full aspect-auto">
              <BarChart data={resolutionTimeMonthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="days" fill="var(--color-days)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Most Common Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {violationTypes.map((v, i) => (
              <div key={v.type} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground">{v.type}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">{v.count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive/60 rounded-full" style={{ width: `${(v.count / maxViolation) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reports by barangay */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Reports by Barangay</CardTitle>
          <p className="text-xs text-muted-foreground">Barangays generating the most waste reports</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={brgyConfig} className="h-[300px] w-full aspect-auto">
            <BarChart data={reportsByBarangay} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={75} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="reports" fill="var(--color-reports)" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectionWasteReports;
