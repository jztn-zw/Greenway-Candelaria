import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { truckUtilization, driverComparison } from "./mockData";
import { Truck, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const utilizationConfig = {
  active: { label: "Active Days", color: "hsl(145, 63%, 32%)" },
  idle: { label: "Idle Days", color: "hsl(var(--muted))" },
};

const SectionTruckDriver = () => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Utilization chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Truck Utilization
            </CardTitle>
            <p className="text-xs text-muted-foreground">Active vs idle days for the selected period</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={utilizationConfig} className="h-[220px] w-full aspect-auto">
              <BarChart data={truckUtilization}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="truck" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="active" fill="var(--color-active)" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="idle" fill="var(--color-idle)" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Active
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Idle
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg barangays per trip */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Avg Barangays per Trip</CardTitle>
            <p className="text-xs text-muted-foreground">Average number of barangays covered per collection run</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center gap-10 h-[220px]">
            {driverComparison.map((d) => (
              <div key={d.truck} className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl font-bold text-primary font-display">{d.avgBarangays}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{d.truck}</p>
                <p className="text-xs text-muted-foreground">{d.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Driver comparison table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Driver Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead className="text-right">Routes Completed</TableHead>
                <TableHead className="text-right">Avg Barangays/Trip</TableHead>
                <TableHead className="text-right">On-Time Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverComparison.map((d) => (
                <TableRow key={d.name}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.truck}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.routesCompleted}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.avgBarangays}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={d.onTimeRate >= 90 ? "default" : "secondary"} className={d.onTimeRate >= 90 ? "bg-primary/15 text-primary border-0" : ""}>
                      {d.onTimeRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SectionTruckDriver;
