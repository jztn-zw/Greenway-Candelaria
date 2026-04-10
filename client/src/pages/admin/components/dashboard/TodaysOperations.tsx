import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, ChevronDown, ChevronUp, Navigation, CalendarDays, Leaf } from "lucide-react";

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

const trucks: TruckRow[] = [
  {
    name: "Truck 01",
    plate: "ABC-1234",
    driver: "Juan Dela Cruz",
    currentBarangay: "Brgy. Poblacion",
    completed: 3,
    total: 5,
    status: "Active",
    lastUpdate: "2 min ago",
    driverMessage: "Currently collecting at Purok 3",
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
    driverMessage: "On break — resuming at 2:00 PM",
  },
];

const barangays = [
  { name: "Brgy. Poblacion", status: "Done" },
  { name: "Brgy. Malabanban Norte", status: "In Progress" },
  { name: "Brgy. Malabanban Sur", status: "Not Yet Started" },
  { name: "Brgy. Kinatihan I", status: "Done" },
  { name: "Brgy. Pahinga Norte", status: "Not Yet Started" },
];

const statusColors: Record<string, string> = {
  Active: "bg-primary/10 text-primary",
  Idle: "bg-yellow-500/10 text-yellow-600",
  Offline: "bg-destructive/10 text-destructive",
};

const brgyStatusColors: Record<string, string> = {
  Done: "bg-primary/10 text-primary",
  "In Progress": "bg-blue-500/10 text-blue-600",
  "Not Yet Started": "bg-muted text-muted-foreground",
};

const truckBorderColors: Record<string, string> = {
  Active: "",
  Idle: "border-l-4 border-l-yellow-500",
  Offline: "border-l-4 border-l-destructive",
};

const TodaysOperations = () => {
  const [showBarangays, setShowBarangays] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Today's Operations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Waste type banner */}
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-4 py-2.5">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Today: <span className="text-primary">Biodegradable Collection</span> — Monday</span>
        </div>

        {/* Truck rows */}
        <div className="space-y-2">
          {trucks.map((t) => (
            <div key={t.name} className={`bg-muted/30 rounded-lg p-4 ${truckBorderColors[t.status]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t.name} <span className="text-muted-foreground font-normal">({t.plate})</span></p>
                    <p className="text-xs text-muted-foreground">Driver: {t.driver}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[t.status]}`}>{t.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {t.currentBarangay}
                </div>
                <div className="text-muted-foreground">
                  Progress: <span className="font-medium text-foreground">{t.completed}/{t.total}</span> barangays
                </div>
                <div className="text-muted-foreground">Updated: {t.lastUpdate}</div>
                <div className="text-muted-foreground italic">"{t.driverMessage}"</div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(t.completed / t.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Barangay list */}
        <button
          onClick={() => setShowBarangays(!showBarangays)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          {showBarangays ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showBarangays ? "Hide" : "Show"} Barangay Status ({barangays.length})
        </button>

        {showBarangays && (
          <div className="space-y-1.5">
            {barangays.map((b) => (
              <div key={b.name} className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-md">
                <span className="text-xs text-foreground">{b.name}</span>
                <Badge variant="outline" className={`text-[10px] ${brgyStatusColors[b.status]}`}>{b.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs">
            <Navigation className="w-3.5 h-3.5" /> Live Map
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs">
            <CalendarDays className="w-3.5 h-3.5" /> Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysOperations;
