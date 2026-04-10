import { useState } from "react";
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
import { AlertTriangle, ExternalLink, FileWarning } from "lucide-react";
import { mockMissedCollections } from "../data/mockData";
import type { AdminTruck } from "../types";

interface MissedCollectionLogProps {
  trucks: AdminTruck[];
}

const MissedCollectionLog = ({ trucks }: MissedCollectionLogProps) => {
  const [truckFilter, setTruckFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");

  const filtered = mockMissedCollections.filter((entry) => {
    if (truckFilter !== "all" && entry.truck !== truckFilter) return false;
    if (barangayFilter !== "all" && entry.barangay !== barangayFilter) return false;
    return true;
  });

  const barangays = [...new Set(mockMissedCollections.map((e) => e.barangay))];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2 border-destructive/20 text-destructive hover:bg-destructive/5">
          <FileWarning className="w-3.5 h-3.5" />
          Missed Collection Log ({mockMissedCollections.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Missed Collection Log
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={truckFilter} onValueChange={setTruckFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All trucks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trucks</SelectItem>
              {trucks.map((t) => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={barangayFilter} onValueChange={setBarangayFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All barangays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Barangays</SelectItem>
              {barangays.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Log entries */}
        <div className="max-h-[360px] overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No entries found</div>
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
                    <span className="text-sm font-semibold text-foreground">{entry.barangay}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {entry.date}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.truck} · {entry.driver}
                  </p>
                  {entry.residentReportLink && (
                    <button className="flex items-center gap-1 mt-1.5 text-[11px] text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      View Report {entry.residentReportLink}
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

export default MissedCollectionLog;
