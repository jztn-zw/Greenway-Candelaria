import { Search, X, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfToday, subDays } from "date-fns";
import { useState } from "react";

interface AuditLogFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  moduleFilter: string;
  onModuleFilterChange: (val: string) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
}

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "reports", label: "Waste Reports" },
  { value: "routes", label: "Route Manager" },
  { value: "users", label: "Accounts" },
  { value: "residents", label: "Resident Manager" },
  { value: "drivers", label: "Driver Manager" },
  { value: "trucks", label: "Truck Manager" },
  { value: "schedule", label: "Collection Schedule" },
  { value: "announcements", label: "Announcements" },
  { value: "posts", label: "Posts" },
  { value: "auth", label: "Authentication" },
  { value: "barangays", label: "Barangay Manager" },
  { value: "landing-content", label: "Landing Page" },
];

const AuditLogFilters = ({
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  dateRange,
  onDateRangeChange,
}: AuditLogFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const hasActiveFilters =
    Boolean(dateRange.from) ||
    Boolean(search.trim()) ||
    moduleFilter !== "all";

  const clearAll = () => {
    onDateRangeChange({});
    onSearchChange("");
    onModuleFilterChange("all");
  };

  const isPresetActive = (days: number) => {
    if (!dateRange.from || !dateRange.to) return false;
    const today = startOfToday();
    const todayStr = format(today, "yyyy-MM-dd");
    const targetFromStr = format(
      days === 0 ? today : subDays(today, days - 1),
      "yyyy-MM-dd",
    );
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    return toStr === todayStr && fromStr === targetFromStr;
  };

  const handlePresetClick = (days: number) => {
    if (isPresetActive(days)) {
      onDateRangeChange({});
      return;
    }
    const today = startOfToday();
    if (days === 0) {
      onDateRangeChange({ from: today, to: today });
    } else {
      onDateRangeChange({ from: subDays(today, days - 1), to: today });
    }
  };

  const isCustomDateSelected =
    Boolean(dateRange.from) &&
    !isPresetActive(0) &&
    !isPresetActive(7) &&
    !isPresetActive(30);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* ── Left Controls: Search Bar + All Modules Dropdown ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search action, user, target ID..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9 h-10 rounded-xl bg-background border-border/80 text-xs shadow-2xs focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/40 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* All Modules Dropdown */}
          <Select value={moduleFilter} onValueChange={onModuleFilterChange}>
            <SelectTrigger className="h-10 min-w-[160px] w-auto rounded-xl border-border/80 bg-background text-xs shadow-2xs font-medium shrink-0 hover:border-border transition-colors">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-[320px] shadow-lg border-border/80">
              {MODULE_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Right Controls: Quick Date Pill + Custom Calendar + Reset ── */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Quick Date Presets Capsule */}
          <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
            {[
              { label: "Today", days: 0 },
              { label: "7 days", days: 7 },
              { label: "30 days", days: 30 },
            ].map((preset) => {
              const active = isPresetActive(preset.days);
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset.days)}
                  className={`h-8 px-3.5 text-xs rounded-lg font-medium transition-all duration-200 cursor-pointer active:scale-95 ${
                    active
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Popover Button */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-10 px-3.5 text-xs rounded-xl shadow-2xs gap-2 cursor-pointer active:scale-95 font-medium transition-all ${
                  isCustomDateSelected
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/15"
                    : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <CalendarIcon
                  className={`w-3.5 h-3.5 ${
                    isCustomDateSelected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-emerald-600/70"
                  }`}
                />
                <span>
                  {dateRange.from
                    ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}`
                    : "Custom Date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 rounded-2xl shadow-xl border-border/80"
              align="end"
            >
              <Calendar
                mode="range"
                selected={
                  dateRange.from
                    ? { from: dateRange.from, to: dateRange.to }
                    : undefined
                }
                onSelect={(range) => {
                  onDateRangeChange({ from: range?.from, to: range?.to });
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>

          {/* 1-Click Reset */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5 cursor-pointer hover:bg-muted/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogFilters;
