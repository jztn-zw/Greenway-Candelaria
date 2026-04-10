import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck, AlertTriangle, MapPin, Package, CheckCircle2, Clock, Timer, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- Waste schedule for Candelaria MENRO ---
const wasteTypes: Record<string, { label: string; tag: string; tagColor: string }> = {
  Mon: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-primary/10 text-primary" },
  Tue: { label: "Non-Biodegradable", tag: "Non-Bio", tagColor: "bg-accent/10 text-accent" },
  Wed: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-primary/10 text-primary" },
  Thu: { label: "Non-Biodegradable", tag: "Non-Bio", tagColor: "bg-accent/10 text-accent" },
  Fri: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-primary/10 text-primary" },
  Sat: { label: "Non-Biodegradable", tag: "Non-Bio", tagColor: "bg-accent/10 text-accent" },
  Sun: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-primary/10 text-primary" },
};
const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayKey = dayKeys[new Date().getDay()];
const todayWaste = wasteTypes[todayKey];

// Mock truck state: "waiting" | "on-the-way" | "done"
type TruckState = "waiting" | "on-the-way" | "done";

const HeroCards = () => {
  const navigate = useNavigate();
  const [truckState] = useState<TruckState>("on-the-way");
  const [collectionDoneTime] = useState("9:42 AM");
  const [countdown, setCountdown] = useState("");

  // Countdown timer to scheduled collection (mock: 2h30m from now)
  useEffect(() => {
    if (truckState !== "waiting") return;
    const target = Date.now() + 2.5 * 60 * 60 * 1000;
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCountdown("Starting soon"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [truckState]);

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* Today's Collection Card */}
      <Card className="border border-border overflow-hidden group hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {/* Color strip top */}
          <div className="h-1 bg-primary" />
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Today's Collection
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${todayWaste.tagColor}`}>
                {todayWaste.tag}
              </span>
            </div>

            {truckState === "waiting" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{todayWaste.label}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Timer className="w-3 h-3" />
                      <span>Starts in {countdown}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {truckState === "on-the-way" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 animate-pulse">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">On The Way</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Truck #GW-02 · ~20 min away</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/resident/tracking")}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  <MapPin className="w-3 h-3" /> Track live <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {truckState === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Collection Done</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Completed at {collectionDoneTime}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5"
                  onClick={() => navigate("/resident/report", { state: { type: "missed-collection" } })}
                >
                  <AlertTriangle className="w-3 h-3" /> Report Missed Collection
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Truck Status Card */}
      <Card className="border border-border overflow-hidden group hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="h-1 bg-leaf" />
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Truck Status
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                On Route
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Truck #GW-02</p>
                <p className="text-xs text-muted-foreground mt-0.5">Est. arrival: ~20 min</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Route Progress</span>
                <span className="font-semibold text-foreground">14 / 25 barangays</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: "56%" }} />
              </div>
            </div>
            {/* Driver message */}
            <div className="mt-3 p-2 rounded-lg bg-sand text-xs text-muted-foreground italic">
              "Running 15 min late due to traffic on San Pablo Rd."
            </div>
            <button
              onClick={() => navigate("/resident/tracking")}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mt-3"
            >
              <MapPin className="w-3 h-3" /> Open live map <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Report Card */}
      <Card className="border border-border overflow-hidden group hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
        <CardContent className="p-0">
          <div className="h-1 bg-earth-dark" />
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Latest Report
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-earth text-earth-dark flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Illegal Dumping</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  Large pile of household waste dumped near creek...
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/resident/my-reports")}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mt-2"
            >
              View all reports <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroCards;
