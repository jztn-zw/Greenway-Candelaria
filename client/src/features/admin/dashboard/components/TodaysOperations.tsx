import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Truck,
  MapPin,
  ChevronDown,
  ChevronUp,
  Leaf,
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
  status: "Active" | "Idle" | "Offline";
  lastUpdate: string;
  driverMessage: string;
}

const defaultTrucks: TruckRow[] = [
  {
    name: "Truck 01",
    plate: "ABC-1234",
    driver: "Juan Dela Cruz",
    currentBarangay: "Brgy. Poblacion",
    completed: 3,
    total: 5,
    status: "Active",
    lastUpdate: "2 min ago",
    driverMessage: "Collecting at Purok 3",
  },
  {
    name: "Truck 02",
    plate: "XYZ-5678",
    driver: "Pedro Santos",
    currentBarangay: "Brgy. Malabanban Norte",
    completed: 1,
    total: 4,
    status: "Idle",
    lastUpdate: "15 min ago",
    driverMessage: "On mandatory rest break",
  },
];

const defaultBarangays = [
  { name: "Brgy. Poblacion", status: "Done", truck: "Truck 01" },
  { name: "Brgy. Malabanban Norte", status: "In Progress", truck: "Truck 02" },
  { name: "Brgy. Kinatihan I", status: "Done", truck: "Truck 01" },
  { name: "Brgy. Malabanban Sur", status: "Not Started", truck: "Unassigned" },
  { name: "Brgy. Pahinga Norte", status: "Not Started", truck: "Unassigned" },
];

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  Active: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  Idle: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
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

  const displayTrucks: TruckRow[] = liveTrucks && liveTrucks.length > 0
    ? liveTrucks.map((t, idx) => ({
        name: t.name || `Truck 0${idx + 1}`,
        plate: t.plate_number || "GW-TRUCK",
        driver: t.driver_name || (idx === 0 ? "Juan Dela Cruz" : "Pedro Santos"),
        currentBarangay: t.current_route || (idx === 0 ? "Brgy. Poblacion" : "Brgy. Malabanban Norte"),
        completed: t.completed_barangays ?? (idx === 0 ? 3 : 1),
        total: t.total_barangays ?? (idx === 0 ? 5 : 4),
        status: (t.status as string) === "ACTIVE" ? "Active" : (t.status as string) === "IDLE" ? "Idle" : "Offline",
        lastUpdate: "Live data",
        driverMessage: idx === 0 ? "Collecting sector routes" : "On standby",
      }))
    : defaultTrucks;

  const displayBarangays = liveBarangays && liveBarangays.length > 0
    ? liveBarangays.map((b, idx) => ({
        name: b.name.startsWith("Brgy") ? b.name : `Brgy. ${b.name}`,
        status: idx < 2 ? "Done" : idx === 2 ? "In Progress" : "Not Started",
        truck: idx === 0 ? "Truck 01" : idx === 1 ? "Truck 02" : "Unassigned",
      }))
    : defaultBarangays;

  const doneCount = displayBarangays.filter((b) => b.status === "Done").length;
  const inProgressCount = displayBarangays.filter((b) => b.status === "In Progress").length;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
                Today's Fleet Operations
              </h3>
              <p className="text-xs text-muted-foreground">
                Dispatch status & live collection progress
              </p>
            </div>
          </div>

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

        {/* Waste Type Scheduled Today */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Scheduled: <strong className="font-bold">Biodegradable Waste</strong> (Mon/Wed/Fri)
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
            {displayTrucks.filter(t => t.status === "Active").length} Active
          </span>
        </div>

        {/* Truck Fleet Cards */}
        <div className="space-y-2.5">
          {displayTrucks.map((t) => {
            const pct = Math.round((t.completed / t.total) * 100);
            const style = statusStyles[t.status] || statusStyles.Active;

            return (
              <div
                key={t.name}
                className="bg-background border border-border/80 rounded-xl p-3.5 shadow-2xs space-y-2.5 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                      <Truck className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground">
                          {t.name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ({t.plate})
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Driver: <span className="font-medium text-foreground">{t.driver}</span>
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${style.bg} ${style.text} ${style.border}`}
                  >
                    {t.status}
                  </Badge>
                </div>

                {/* Progress Bar */}
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

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span className="truncate italic">"{t.driverMessage}"</span>
                  <span className="shrink-0">{t.lastUpdate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Expandable Barangay Coverage with ScrollArea & 2-Column Grid */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodaysOperations;
