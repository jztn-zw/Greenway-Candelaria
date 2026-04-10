import { useState } from "react";
import { CalendarDays, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const AnalyticsFilterBar = () => {
  const [datePreset, setDatePreset] = useState("this-month");
  const [barangay, setBarangay] = useState("all");
  const [zone, setZone] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date(2026, 2, 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date(2026, 2, 31));

  return (
    <div className="bg-card border border-border rounded-xl p-4 sticky top-0 z-30 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Date range presets */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom date pickers */}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-sm font-normal", !dateFrom && "text-muted-foreground")}>
                  {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-sm font-normal", !dateTo && "text-muted-foreground")}>
                  {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="hidden lg:block w-px h-6 bg-border" />

        {/* Barangay filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0 lg:block hidden" />
          <Select value={barangay} onValueChange={setBarangay}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="All Barangays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Barangays</SelectItem>
              <SelectItem value="malabanban-norte">Malabanban Norte</SelectItem>
              <SelectItem value="poblacion">Poblacion</SelectItem>
              <SelectItem value="dewey">Dewey</SelectItem>
              <SelectItem value="buenavista">Buenavista</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Zone filter */}
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="zone-1">Zone 1</SelectItem>
            <SelectItem value="zone-2">Zone 2</SelectItem>
            <SelectItem value="zone-3">Zone 3</SelectItem>
          </SelectContent>
        </Select>

        {/* Export */}
        <div className="lg:ml-auto">
          <Button variant="outline" size="sm" className="gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilterBar;
