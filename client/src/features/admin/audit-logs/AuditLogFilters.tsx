import { SearchInput } from "@/components/common/SearchInput";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

const DATE_PRESETS: FilterPillItem<"0" | "7" | "30">[] = [
  { id: "0", label: "Today" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
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
          <SearchInput
            placeholder="Search action, user, target ID..."
            value={search}
            onChange={onSearchChange}
            containerClassName="flex-1"
          />

          {/* All Modules Dropdown */}
          <SearchableSelect value={moduleFilter} onValueChange={onModuleFilterChange}
            options={MODULE_OPTIONS} placeholder="All Modules" aria-label="Module" searchPlaceholder="Search modules..."
            className="h-10 min-w-[160px] w-auto rounded-xl border-border/80 bg-background text-xs shadow-2xs font-medium shrink-0 hover:border-border transition-colors" />
        </div>

        {/* ── Right Controls: Quick Date Pill + Custom Calendar + Reset ── */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <FilterPillTabs
            items={DATE_PRESETS}
            activeId={DATE_PRESETS.find(({ id }) => isPresetActive(Number(id)))?.id}
            onChange={(id) => handlePresetClick(Number(id))}
            ariaLabel="Audit log date presets"
          />

          {/* Custom Date Range Popover Button */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={isCustomDateSelected ? "default" : "outline"}
                size="sm"
                className={`h-10 rounded-xl px-3.5 font-body text-xs font-semibold transition-colors gap-2 cursor-pointer ${isCustomDateSelected ? "shadow-xs" : ""}`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>
                  {isCustomDateSelected && dateRange.from
                    ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}`
                    : "Date range"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 rounded-2xl shadow-md border-border/80"
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
              className="h-10 px-3 text-xs rounded-xl gap-1.5 cursor-pointer transition-colors"
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
