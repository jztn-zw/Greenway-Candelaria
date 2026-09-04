import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { truckUtilization, driverComparison } from "./mockData";
import { Truck, Users, MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const utilizationConfig = {
  active: { label: "Active Days", color: "hsl(145, 63%, 32%)" },
  idle: { label: "Idle Days", color: "hsl(var(--muted))" },
};

const SectionTruckDriver: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Utilization Chart */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Truck Fleet Utilization</h3>
              <p className="text-xs text-muted-foreground">Active vs idle operating days in current period</p>
            </div>
          </div>

          <ChartContainer config={utilizationConfig} className="h-[220px] w-full aspect-auto">
            <BarChart data={truckUtilization}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="truck" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="active" fill="var(--color-active)" radius={[6, 6, 0, 0]} stackId="a" />
              <Bar dataKey="idle" fill="var(--color-idle)" radius={[6, 6, 0, 0]} stackId="a" />
            </BarChart>
          </ChartContainer>

          <div className="flex justify-center gap-4 pt-1 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
              <span>Active Route Days</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-muted" />
              <span>Idle / Standby Days</span>
            </div>
          </div>
        </div>

        {/* Avg Barangays per Trip */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Average Stops per Trip</h3>
              <p className="text-xs text-muted-foreground">Barangay coverage density per collection dispatch</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            {driverComparison.map((d) => (
              <div
                key={d.truck}
                className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-center space-y-2 shadow-2xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-2xs">
                  <span className="text-2xl font-bold font-display">{d.avgBarangays}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{d.truck}</p>
                  <p className="text-xs text-muted-foreground">{d.name}</p>
                </div>
                <div className="text-[11px] font-semibold text-primary">
                  {d.routesCompleted} completed dispatches
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Municipal average: <span className="font-bold text-foreground">5.8 barangays</span> per collection cycle
          </div>
        </div>
      </div>

      {/* Driver Comparison Table */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Driver Operations Comparison</h3>
              <p className="text-xs text-muted-foreground">Personnel efficiency, dispatch completion, and schedule adherence</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/80">
                <TableHead className="font-bold text-xs uppercase tracking-wider">Driver</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Assigned Truck</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Routes Completed</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Avg Barangays / Trip</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">On-Time Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {driverComparison.map((d) => (
                <TableRow key={d.name} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-foreground text-xs py-3.5">
                    {d.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3.5">
                    {d.truck}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-semibold py-3.5">
                    {d.routesCompleted}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-semibold py-3.5">
                    {d.avgBarangays}
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        d.onTimeRate >= 90
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {d.onTimeRate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SectionTruckDriver;
