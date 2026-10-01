import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
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
  id: string;
  name: string;
  plate: string;
  driver: string;
  currentRoute: string;
  completed: number;
  total: number;
  status: "Scheduled" | "On route" | "Paused" | "Completed" | "Partial" | "Cancelled" | "No route today" | "Under maintenance";
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  "On route": getStatusBadgeStyle("On route"),
  Scheduled: getStatusBadgeStyle("Scheduled"),
  Completed: getStatusBadgeStyle("Completed"),
  Paused: getStatusBadgeStyle("Paused"),
  Partial: getStatusBadgeStyle("Partial"),
  Cancelled: getStatusBadgeStyle("Cancelled"),
  "No route today": getStatusBadgeStyle("No route today"),
  "Under maintenance": getStatusBadgeStyle("Under maintenance"),
};

interface TodaysOperationsProps {
  trucks?: DashboardTruck[];
  barangays?: DashboardBarangay[];
}

const TodaysOperations = ({ trucks: liveTrucks, barangays: liveBarangays }: TodaysOperationsProps) => {
  const [showBarangays, setShowBarangays] = useState(false);
  const navigate = useNavigate();

  const displayTrucks: TruckRow[] = (liveTrucks ?? []).map((t) => {
    const hasRoute = Boolean(t.run_status && t.run_status !== "CANCELLED");
    const status = t.availability_status === "UNDER_MAINTENANCE"
      ? "Under maintenance"
      : !hasRoute
        ? t.run_status === "CANCELLED" ? "Cancelled" : "No route today"
        : t.run_status === "ACTIVE"
          ? "On route"
          : t.run_status === "PAUSED"
            ? "Paused"
          : t.run_status === "SCHEDULED"
            ? "Scheduled"
            : t.run_status === "COMPLETED"
              ? "Completed"
              : "Partial";

    return {
      id: t.id,
      name: t.name,
      plate: t.plate_number,
      driver: t.driver_name || "No driver assigned",
      currentRoute: t.current_route || "No route assigned today",
      completed: Number(t.completed_stops ?? 0),
      total: Number(t.total_stops ?? 0),
      status,
    };
  });

  const displayBarangays = (liveBarangays ?? []).map((b) => ({
    id: b.id,
    name: b.name.startsWith("Brgy") ? b.name : `Brgy. ${b.name}`,
    status: b.status === "DONE" ? "Done" : b.status === "IN_PROGRESS" ? "In Progress" : b.status === "MISSED" ? "Missed" : "Not Started",
    truck: b.truck_name || "Unassigned",
  }));

  const doneCount = displayBarangays.filter((b) => b.status === "Done").length;
  const inProgressCount = displayBarangays.filter((b) => b.status === "In Progress").length;

  const totalTargetBarangays = displayBarangays.length;
  const overallFleetProgress = totalTargetBarangays > 0
    ? Math.round((doneCount / totalTargetBarangays) * 100)
    : 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col justify-between min-w-0 h-full">
      <div>
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
          <h3 className="gw-heading text-base sm:text-lg text-foreground tracking-tight">
            Today's Fleet Operations
          </h3>

          <Button
            variant="primary-ghost"
            size="sm"
            className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer"
            onClick={() => navigate("/admin/routes")}
          >
            <span>Route Manager</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Overall Municipal Route Dispatch Progress */}
        <div className="mb-3 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-foreground">
              Today's Barangay Coverage
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {totalTargetBarangays > 0
                ? `${doneCount} of ${totalTargetBarangays} barangays (${overallFleetProgress}%)`
                : "No barangays scheduled today"}
            </span>
          </div>
          {totalTargetBarangays > 0 && <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallFleetProgress}%` }}
            />
          </div>}
        </div>

        {/* Truck Fleet Cards */}
        <div className="space-y-3">
          {displayTrucks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              No trucks are registered yet.
            </div>
          ) : totalTargetBarangays === 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {displayTrucks.map((t) => {
                const style = statusStyles[t.status];

                return (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{t.name}</p>
                      <p className="mt-1 text-ui-caption tabular-nums text-muted-foreground">{t.plate}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 rounded-md border px-2.5 py-0.5 text-ui-caption font-semibold ${style.bg} ${style.text} ${style.border}`}
                    >
                      {t.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : displayTrucks.map((t) => {
            const pct = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
            const style = statusStyles[t.status];

            return (
              <div
                key={t.id}
                className="bg-muted/20 border border-border/60 rounded-xl p-3 sm:p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        {t.name}
                      </span>
                      <span className="text-ui-caption tabular-nums font-medium tabular-nums text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-lg border border-border/60">
                        {t.plate}
                      </span>
                    </div>
                    <p className="text-ui-caption text-muted-foreground truncate mt-1">
                      Driver: <span className="font-medium text-foreground">{t.driver}</span>
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`shrink-0 text-ui-caption font-semibold px-2.5 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}
                  >
                    {t.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-ui-caption">
                    <span className="flex min-w-0 items-center gap-1 text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      {t.currentRoute}
                    </span>
                    <span className="shrink-0 font-semibold text-foreground tabular-nums">
                      {t.completed}/{t.total} stops ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Compact Expandable Barangay Coverage with ScrollArea & 2-Column Grid */}
        {displayBarangays.length > 0 && <div className="mt-3 border border-border/60 rounded-xl overflow-hidden bg-muted/20">
          <button
            type="button"
            onClick={() => setShowBarangays(!showBarangays)}
            className="w-full flex items-center justify-between gap-3 p-3 sm:px-4 text-xs font-semibold text-foreground hover:bg-[var(--button-neutral-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-left">
                  <span>Today's Barangays ({displayBarangays.length})</span>
              <span className="text-ui-overline font-normal text-muted-foreground hidden sm:inline">
                · {doneCount} Done, {inProgressCount} Active
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
              <span className="text-ui-caption font-normal">{showBarangays ? "Collapse" : "View"}</span>
              {showBarangays ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {showBarangays && (
            <div className="border-t border-border/60 p-3 animate-fade-in">
              {displayBarangays.length === 0 ? (
                <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                  No active routes are scheduled for today.
                </p>
              ) : (
              <ScrollArea className="h-[210px] pr-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayBarangays.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-card border border-border/60 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-medium text-foreground truncate">{b.name}</p>
                        <p className="mt-1 text-ui-caption text-muted-foreground">{b.truck}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={"text-ui-caption font-semibold px-2.5 py-0.5 shrink-0 rounded-md border " + getStatusBadgeStyle(b.status).className}
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
      {totalTargetBarangays === 0 && displayTrucks.length > 0 && (
        <p className="mt-4 border-t border-border/60 pt-3 text-ui-caption leading-relaxed text-muted-foreground">
          No collection activity is scheduled for today.
        </p>
      )}
    </div>
  );
};

export default TodaysOperations;
