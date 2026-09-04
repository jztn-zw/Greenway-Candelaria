import React, { useState, useEffect } from "react";
import { SlidersHorizontal, CalendarDays, Calendar as CalendarIcon, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { fetchBarangaysAdmin, BarangayAdminRow } from "@/services/barangaysService";

interface AnalyticsFilterBarProps {
  datePreset?: string;
  onDatePresetChange?: (preset: string) => void;
  selectedBarangay?: string;
  onBarangayChange?: (b: string) => void;
}

const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  datePreset: externalPreset,
  onDatePresetChange,
  selectedBarangay: externalBarangay,
  onBarangayChange,
}) => {
  const [internalDatePreset, setInternalDatePreset] = useState("this-month");
  const [internalBarangay, setInternalBarangay] = useState("all");
  const [barangaysList, setBarangaysList] = useState<BarangayAdminRow[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date(2026, 2, 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date(2026, 2, 31));

  const datePreset = externalPreset ?? internalDatePreset;
  const barangay = externalBarangay ?? internalBarangay;

  const handlePresetChange = (val: string) => {
    setInternalDatePreset(val);
    onDatePresetChange?.(val);
  };

  const handleBarangayChange = (val: string) => {
    setInternalBarangay(val);
    onBarangayChange?.(val);
  };

  const handleReset = () => {
    handlePresetChange("this-month");
    handleBarangayChange("all");
    setDateFrom(new Date(2026, 2, 1));
    setDateTo(new Date(2026, 2, 31));
  };

  const isFiltered = datePreset !== "this-month" || barangay !== "all";

  useEffect(() => {
    let mounted = true;
    const loadBarangays = async () => {
      try {
        const rows = await fetchBarangaysAdmin();
        if (mounted && rows && rows.length > 0) {
          setBarangaysList(rows.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch {
        // fallback
      }
    };
    void loadBarangays();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
      {/* Left: Filter Label and Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {isFiltered && (
            <Badge className="h-4 min-w-4 justify-center rounded-full border-0 bg-primary/15 px-1 text-[9px] text-primary hover:bg-primary/15">
              Active
            </Badge>
          )}
        </div>

        {/* Period Selector */}
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="h-9 text-xs w-auto min-w-[145px] bg-card border-border/80 rounded-xl font-medium gap-2 shadow-2xs">
            <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="this-week" className="text-xs">This Week</SelectItem>
            <SelectItem value="this-month" className="text-xs">This Month</SelectItem>
            <SelectItem value="last-3-months" className="text-xs">Last 3 Months</SelectItem>
            <SelectItem value="custom" className="text-xs">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Pickers */}
        {datePreset === "custom" && (
          <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs font-medium rounded-lg",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3 h-3 mr-1 text-muted-foreground" />
                  {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-[10px] font-semibold uppercase">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs font-medium rounded-lg",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3 h-3 mr-1 text-muted-foreground" />
                  {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Barangay Filter */}
        <Select value={barangay} onValueChange={handleBarangayChange}>
          <SelectTrigger className="h-9 text-xs w-auto min-w-[160px] bg-card border-border/80 rounded-xl font-medium gap-2 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="All Barangays" />
          </SelectTrigger>
          <SelectContent className="max-h-60 rounded-xl">
            <SelectItem value="all" className="text-xs">All 25 Barangays</SelectItem>
            {barangaysList.length > 0 ? (
              barangaysList.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="malabanban-norte" className="text-xs">Malabanban Norte</SelectItem>
                <SelectItem value="poblacion" className="text-xs">Poblacion</SelectItem>
                <SelectItem value="masin-norte" className="text-xs">Masin Norte</SelectItem>
                <SelectItem value="masin-sur" className="text-xs">Masin Sur</SelectItem>
                <SelectItem value="pahinga-norte" className="text-xs">Pahinga Norte</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Right: Reset Action if filtered */}
      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
};

export default AnalyticsFilterBar;
