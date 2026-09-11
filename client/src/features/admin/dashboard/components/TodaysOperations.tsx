import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardTruck, DashboardBarangay } from "./useAdminDashboard";

interface TruckRow {
  name: string;
  plate: string;
  driver: string;
  currentBarangay: string;
  completed: number;
  total: number;
  status: "Scheduled" | "On route" | "Completed" | "Offline" | "No route today" | "Under maintenance";
  driverMessage: string;
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  "On route": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  Scheduled: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  Completed: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
  },
  "No route today": {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border/70",
  },
  "Under maintenance": {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/25",
  },
  Offline: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
  },
};

interface TodaysOperationsProps {
  trucks?: DashboardTruck[];
  barangays?: DashboardBarangay[];
}

const TodaysOperations = ({ trucks: liveTrucks, barangays: liveBarangays }: TodaysOperationsProps) => {
  const [showBarangays, setShowBarangays] = useState(false);
  const navigate = useNavigate();

  const displayTrucks: TruckRow[] = (liveTrucks ?? []).map((t) => {
    const hasRoute = Number(t.total_barangays ?? 0) > 0;
    const status = t.availability_status === "UNDER_MAINTENANCE"
      ? "Under maintenance"
      : !hasRoute
        ? "No route today"
        : t.status === "ON_THE_WAY"
          ? "On route"
          : t.status === "SCHEDULED"
            ? "Scheduled"
            : t.status === "DONE"
              ? "Completed"
              : "Offline";

    return {
      name: t.name,
      plate: t.plate_number,
      driver: t.driver_name || "No driver assigned",
      currentBarangay: t.current_route || "No active route today",
      completed: Number(t.completed_barangays ?? 0),
      total: Number(t.total_barangays ?? 0),
      status,
      driverMessage: hasRoute ? "Today's assigned route" : "No route assigned today",
    };
  });

  const displayBarangays = (liveBarangays ?? []).map((b) => ({
    name: b.name.startsWith("Brgy") ? b.name : `Brgy. ${b.name}`,
    status: b.status === "DONE" ? "Done" : b.status === "IN_PROGRESS" ? "In Progress" : b.status === "MISSED" ? "Missed" : "Not Started",
    truck: b.truck_name || "Unassigned",
  }));

  const doneCount = displayBarangays.filter((b) => b.status === "Done").length;
  const inProgressCount = displayBarangays.filter((b) => b.status === "In Progress").length;

  const totalCompletedSectors = displayBarangays.filter((b) => b.status === "Done").length;
  const totalTargetSectors = displayBarangays.length;
  const overallFleetProgress = totalTargetSectors > 0
    ? Math.round((totalCompletedSectors / totalTargetSectors) * 100)
    : 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground font-display">
            Today's Fleet Operations
          </h3>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary font-semibold h-8 px-3 gap-1.5 hover:bg-primary/10 hover:text-primary rounded-xl cursor-pointer group active:scale-95 transition-all"
            onClick={() => navigate("/admin/routes")}
          >
            <span>Route Manager</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Overall Municipal Route Dispatch Progress */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Municipal Sector Coverage
            </span>
            <span className="font-bold text-primary tabular-nums">
              {totalTargetSectors > 0
                ? `${totalCompletedSectors} of ${totalTargetSectors} sectors (${overallFleetProgress}%)`
                : "No sectors scheduled today"}
            </span>
          </div>
          {totalTargetSectors > 0 && <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallFleetProgress}%` }}
            />
          </div>}
        </div>

        {/* Truck Fleet Cards */}
        <div className="space-y-2.5">
          {displayTrucks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No trucks are registered yet.
            </div>
          ) : totalTargetSectors === 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {displayTrucks.map((t) => {
                const style = statusStyles[t.status] || statusStyles.Offline;

                return (
                  <div
                    key={t.name}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 py-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.plate}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text} ${style.border}`}
                    >
                      {t.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : displayTrucks.map((t) => {
            const pct = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
            const style = statusStyles[t.status] || statusStyles.Offline;

            return (
              <div
                key={t.name}
                className="bg-background border border-border/80 rounded-xl p-3.5 shadow-2xs space-y-2.5 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">
                        {t.name}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                        {t.plate}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      Driver: <span className="font-medium text-foreground">{t.driver}</span>
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${style.bg} ${style.text} ${style.border}`}
                  >
                    {t.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      {t.currentBarangay}
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {t.completed}/{t.total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground pt-0.5">
                  <span className="truncate italic">"{t.driverMessage}"</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Expandable Barangay Coverage with ScrollArea & 2-Column Grid */}
        {displayBarangays.length > 0 && <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
          <button
            type="button"
            onClick={() => setShowBarangays(!showBarangays)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>Today's Route Coverage ({displayBarangays.length})</span>
              <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">
                · {doneCount} Done, {inProgressCount} Active
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-[11px] font-normal">{showBarangays ? "Collapse" : "View"}</span>
              {showBarangays ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showBarangays && (
            <div className="border-t border-border/80 bg-muted/20 p-2.5 animate-fade-in">
              {displayBarangays.length === 0 ? (
                <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                  No active routes are scheduled for today.
                </p>
              ) : (
              <ScrollArea className="h-[210px] pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {displayBarangays.map((b) => (
                    <div
                      key={b.name}
                      className="flex items-center justify-between p-2 px-2.5 rounded-lg bg-card border border-border/60 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-medium text-foreground truncate">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{b.truck}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold px-1.5 py-0 shrink-0 rounded-md border ${
                          b.status === "Done"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : b.status === "In Progress"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground border-border/60"
                        }`}
                      >
                        {b.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              )}
            </div>
          )}
        </div>}
      </div>
      {totalTargetSectors === 0 && displayTrucks.length > 0 && (
        <p className="mt-auto border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          No collection activity is scheduled for today.
        </p>
      )}
    </div>
  );
};

export default TodaysOperations;
