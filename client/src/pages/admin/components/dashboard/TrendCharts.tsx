import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer } from "recharts";

const weeklyData = [
  { day: "Mon", rate: 78 },
  { day: "Tue", rate: 85 },
  { day: "Wed", rate: 72 },
  { day: "Thu", rate: 90 },
  { day: "Fri", rate: 88 },
  { day: "Sat", rate: 65 },
  { day: "Sun", rate: 40 },
];

const reportStatusData = [
  { name: "Pending", value: 7, fill: "hsl(35, 90%, 55%)" },
  { name: "Under Review", value: 5, fill: "hsl(210, 70%, 55%)" },
  { name: "Dispatched", value: 3, fill: "hsl(270, 50%, 55%)" },
  { name: "Resolved", value: 12, fill: "hsl(145, 63%, 32%)" },
];

const growthData = [
  { month: "Oct", residents: 980 },
  { month: "Nov", residents: 1020 },
  { month: "Dec", residents: 1065 },
  { month: "Jan", residents: 1110 },
  { month: "Feb", residents: 1170 },
  { month: "Mar", residents: 1234 },
];

const lineConfig = { rate: { label: "Collection Rate", color: "hsl(145, 63%, 32%)" } };
const barConfig = { residents: { label: "Residents", color: "hsl(145, 63%, 32%)" } };
const pieConfig = {
  Pending: { label: "Pending", color: "hsl(35, 90%, 55%)" },
  "Under Review": { label: "Under Review", color: "hsl(210, 70%, 55%)" },
  Dispatched: { label: "Dispatched", color: "hsl(270, 50%, 55%)" },
  Resolved: { label: "Resolved", color: "hsl(145, 63%, 32%)" },
};

const TrendCharts = () => {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {/* Weekly Collection Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Weekly Collection Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineConfig} className="h-[200px] w-full aspect-auto">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-rate)" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Reports by Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Reports by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={pieConfig} className="h-[200px] w-full aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={reportStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {reportStatusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {reportStatusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                {d.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resident Growth */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resident Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barConfig} className="h-[200px] w-full aspect-auto">
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="residents" fill="var(--color-residents)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendCharts;
