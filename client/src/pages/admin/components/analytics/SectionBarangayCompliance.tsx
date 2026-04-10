import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { barangayCompliance, barangayTrend } from "./mockData";
import { TrendingUp, TrendingDown } from "lucide-react";

const barConfig = { rate: { label: "Compliance Rate", color: "hsl(145, 63%, 32%)" } };
const trendConfig = {
  "Malabanban Norte": { label: "Malabanban Norte", color: "hsl(145, 63%, 32%)" },
  Poblacion: { label: "Poblacion", color: "hsl(210, 60%, 50%)" },
  Dewey: { label: "Dewey", color: "hsl(0, 72%, 51%)" },
  Buenavista: { label: "Buenavista", color: "hsl(35, 90%, 55%)" },
};

const SectionBarangayCompliance = () => {
  const top5 = barangayCompliance.slice(0, 5);
  const bottom5 = barangayCompliance.slice(-5).reverse();

  return (
    <div className="space-y-4">
      {/* Top & Bottom 5 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Top 5 Barangays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {top5.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{b.name}</span>
                    <span className="text-sm font-bold text-primary tabular-nums">{b.rate}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${b.rate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" /> Bottom 5 Barangays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottom5.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-destructive w-5 text-center">{barangayCompliance.length - i}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{b.name}</span>
                    <span className="text-sm font-bold text-destructive tabular-nums">{b.rate}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive/70 rounded-full transition-all duration-700" style={{ width: `${b.rate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Horizontal bar chart - all 25 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">All Barangays — Compliance Rate</CardTitle>
          <p className="text-xs text-muted-foreground">Sorted from highest to lowest compliance</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barConfig} className="h-[500px] w-full aspect-auto">
            <BarChart data={barangayCompliance} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={95} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="rate" fill="var(--color-rate)" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Trend lines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Compliance Trend — Selected Barangays</CardTitle>
          <p className="text-xs text-muted-foreground">Top 2 and bottom 2 barangays over 6 months</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-[260px] w-full aspect-auto">
            <LineChart data={barangayTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[40, 100]} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="Malabanban Norte" stroke="hsl(145, 63%, 32%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Poblacion" stroke="hsl(210, 60%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Dewey" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="Buenavista" stroke="hsl(35, 90%, 55%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-3">
            {Object.entries(trendConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                {cfg.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectionBarangayCompliance;
