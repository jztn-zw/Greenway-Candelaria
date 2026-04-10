import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ExternalLink,
  FileWarning,
  Loader2,
} from "lucide-react";
import type { AdminTruck } from "../types";
import {
  fetchMissedCollections,
  type MissedCollectionRow,
} from "@/services/trackingService";

interface MissedCollectionLogProps {
  trucks: AdminTruck[];
}

const formatEntryDate = (value?: string | null) => {
  if (!value) return "No timestamp";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "No timestamp";
  return dt.toLocaleDateString("en-US");
};

const MissedCollectionLogDynamic = ({ trucks }: MissedCollectionLogProps) => {
  const [truckFilter, setTruckFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [entries, setEntries] = useState<MissedCollectionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const rows = await fetchMissedCollections({ days: 30 });
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchMissedCollections({ days: 30 });
        if (!cancelled) setEntries(rows);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (truckFilter !== "all" && entry.truck !== truckFilter) return false;
        if (barangayFilter !== "all" && entry.barangay !== barangayFilter) {
          return false;
        }
        return true;
      }),
    [entries, truckFilter, barangayFilter],
  );

  const barangays = useMemo(
    () => [...new Set(entries.map((entry) => entry.barangay))],
    [entries],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
        >
          <FileWarning className="w-3.5 h-3.5" />
          Missed Collection Log ({entries.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Missed Collection Log
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Select value={truckFilter} onValueChange={setTruckFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All trucks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trucks</SelectItem>
              {trucks.map((truck) => (
                <SelectItem key={truck.id} value={truck.name}>
                  {truck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={barangayFilter} onValueChange={setBarangayFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All barangays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Barangays</SelectItem>
              {barangays.map((barangay) => (
                <SelectItem key={barangay} value={barangay}>
                  {barangay}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={loadEntries}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        <div className="max-h-[360px] overflow-y-auto space-y-2">
          {isLoading && filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading missed collection logs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No entries found
            </div>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {entry.barangay}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {formatEntryDate(entry.event_at)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.truck} · {entry.driver}
                  </p>
                  {entry.reason && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Reason: {entry.reason}
                    </p>
                  )}
                  {entry.resident_report_link && (
                    <button className="flex items-center gap-1 mt-1.5 text-[11px] text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      View Report {entry.resident_report_link}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MissedCollectionLogDynamic;
