import { getStatusBadgeStyle, badgeStyles } from "@/components/ui/badgeStyles";
import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Truck, UserRoundCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAnalyticsData } from "./AnalyticsDataContext";
import { withDriverChartLabels } from "./analytics.utils";

const routesConfig = {
  completed: { label: "Completed", color: "hsl(var(--chart-1))" },
  incomplete: { label: "Incomplete", color: "hsl(var(--warning))" },
  missedRoutes: { label: "Missed", color: "hsl(var(--error))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--muted-foreground))" },
};

const availabilityClass = (availability: string) => {
  return getStatusBadgeStyle(availability).className;
};

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <p className="px-5 py-10 text-center text-sm text-muted-foreground">{children}</p>
);

const SectionTruckDriver: React.FC = () => {
  const { driverOperations, fleetStatus } = useAnalyticsData();
  const outcomeCount = driverOperations.reduce(
    (total, driver) => total + driver.completed + driver.incomplete + driver.missedRoutes + driver.cancelled,
    0,
  );
  const chartDrivers = withDriverChartLabels(driverOperations);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><UserRoundCog className="h-4 w-4" /></div>
          <div><h3 className="gw-heading text-sm text-foreground">Route outcomes by driver</h3><p className="text-xs text-muted-foreground">Completed, incomplete, missed, and cancelled runs in the selected period.</p></div>
        </div>
        {outcomeCount === 0 ? (
          <EmptyState>No completed, incomplete, missed, or cancelled routes in this period.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <ChartContainer config={routesConfig} className="h-[250px] min-w-[520px] w-full aspect-auto" style={{ minWidth: Math.max(520, chartDrivers.length * 110) }}>
              <BarChart data={chartDrivers}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="completed" stackId="routes" fill="var(--color-completed)" />
                <Bar dataKey="incomplete" stackId="routes" fill="var(--color-incomplete)" />
                <Bar dataKey="missedRoutes" stackId="routes" fill="var(--color-missedRoutes)" />
                <Bar dataKey="cancelled" stackId="routes" fill="var(--color-cancelled)" />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="flex items-center gap-2.5 border-b border-border/80 p-4 sm:p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><UserRoundCog className="h-4 w-4" /></div>
          <div><h3 className="gw-heading text-sm text-foreground">Driver operations</h3><p className="text-xs text-muted-foreground">Current truck assignment and route-run outcomes.</p></div>
        </div>
        {driverOperations.length === 0 ? (
          <EmptyState>No driver routes match this period and barangay.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader className="bg-muted/40"><TableRow className="border-border/80">
                <TableHead>Driver</TableHead><TableHead>Current truck</TableHead>
                <TableHead className="text-right">Route runs</TableHead><TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Incomplete</TableHead><TableHead className="text-right">Missed routes</TableHead>
                <TableHead className="text-right">Cancelled</TableHead><TableHead className="text-right">Missed stops</TableHead>
                <TableHead className="text-right">Stop completion</TableHead>
              </TableRow></TableHeader>
              <TableBody className="divide-y divide-border/60">
                {driverOperations.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-muted/35">
                    <TableCell className="py-3.5 text-xs font-semibold text-foreground">{driver.name}</TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground">{driver.truck}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{driver.assigned}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{driver.completed}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{driver.incomplete}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{driver.missedRoutes}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{driver.cancelled}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{driver.missedStops}</TableCell>
                    <TableCell className="py-3.5 text-right"><Badge variant="outline" className={"text-xs font-bold " + badgeStyles.success.className}>{driver.rate}%</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="border-t border-border/60 px-4 py-3 text-ui-caption text-muted-foreground sm:px-5">Incomplete means a partial or overdue run with some completed stops. Missed means a partial or overdue run with no completed stops. Cancelled plans are separate. Stop completion includes ongoing routes.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="flex items-center gap-2.5 border-b border-border/80 p-4 sm:p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Truck className="h-4 w-4" /></div>
          <div><h3 className="gw-heading text-sm text-foreground">Fleet status</h3><p className="text-xs text-muted-foreground">Current vehicle status and route work in the selected period.</p></div>
        </div>
        {fleetStatus.length === 0 ? (
          <EmptyState>No trucks served this barangay during the selected period.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[780px]">
              <TableHeader className="bg-muted/40"><TableRow className="border-border/80">
                <TableHead>Truck</TableHead><TableHead>Status now</TableHead>
                <TableHead className="text-right">Route runs</TableHead><TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Incomplete</TableHead><TableHead className="text-right">Missed routes</TableHead>
                <TableHead className="text-right">Cancelled</TableHead><TableHead className="text-right">Missed stops</TableHead>
              </TableRow></TableHeader>
              <TableBody className="divide-y divide-border/60">
                {fleetStatus.map((truck) => (
                  <TableRow key={truck.id} className="hover:bg-muted/35">
                    <TableCell className="py-3.5 text-xs font-semibold text-foreground"><div>{truck.truck}</div><div className="mt-0.5 text-ui-caption font-normal text-muted-foreground">{truck.plate}</div></TableCell>
                    <TableCell className="py-3.5"><Badge variant="outline" className={availabilityClass(truck.availability)}>{truck.availability}</Badge></TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{truck.assigned}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{truck.completed}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{truck.incomplete}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{truck.missedRoutes}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{truck.cancelled}</TableCell>
                    <TableCell className="py-3.5 text-right text-xs tabular-nums">{truck.missedStops}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

export default SectionTruckDriver;
