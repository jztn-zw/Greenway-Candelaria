import { SearchInput } from "@/components/common/SearchInput";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
DialogTrigger,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { useAdminQuery } from "@/lib/adminQuery";
import { cn } from "@/lib/utils";
import { fetchBarangays } from "@/services/barangaysService";
import type { AdminReportsKPIs } from "@/services/reportsService";
import { format } from "date-fns";
import { ArrowUpDown, Calendar as CalendarIcon, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ReportStatus, ViolationType } from "./types";

interface ReportFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  violationFilter: string;
  onViolationFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  barangayFilter: string;
  onBarangayFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  kpis?: AdminReportsKPIs;
  total?: number;
}

const violationTypes: ViolationType[] = [
  "Illegal Dumping",
  "Missed Collection",
  "Overflowing Bin",
  "Improper Segregation",
  "Open Burning",
  "Littering",
  "Other",
];

const statuses: ReportStatus[] = ["Submitted", "Under Review", "Dispatched", "Resolved"];

const ReportFilters = ({
  search,
  onSearchChange,
  violationFilter,
  onViolationFilterChange,
  statusFilter,
  onStatusFilterChange,
  barangayFilter,
  onBarangayFilterChange,
  sortBy,
  onSortByChange,
  dateRange,
  onDateRangeChange,
}: ReportFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [modalCalendarOpen, setModalCalendarOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const { data: barangays = [] } = useAdminQuery("barangays", ["locations"], fetchBarangays);

  const STATUS_TABS: FilterPillItem<string>[] = [
    { id: "all", label: "All" },
    { id: "Submitted", label: "Submitted" },
    { id: "Under Review", label: "Under Review" },
    { id: "Dispatched", label: "Dispatched" },
    { id: "Resolved", label: "Resolved" },
  ];

  const secondaryFilterCount = [
    violationFilter !== "all",
    barangayFilter !== "all",
    Boolean(dateRange.from || dateRange.to),
  ].filter(Boolean).length;

  const activeFilterCount = [
    search.trim().length > 0,
    statusFilter !== "all",
    secondaryFilterCount > 0,
  ].filter(Boolean).length;

  const clearSecondary = () => {
    onViolationFilterChange("all");
    onBarangayFilterChange("all");
    onDateRangeChange({});
  };

  const clearAll = () => {
    clearSecondary();
    onStatusFilterChange("all");
    onSearchChange("");
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
        {/* Status filters */}
        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 overflow-hidden">
          <FilterPillTabs
            items={STATUS_TABS}
            activeId={statusFilter}
            onChange={onStatusFilterChange}
            ariaLabel="Report status filters"
            className="overscroll-x-contain"
          />
        </div>

        {/* Search Input + Mobile Filter Sheet Trigger */}
        <div className="flex items-center gap-2 w-full xl:w-auto">
          <SearchInput
            placeholder="Search reference, resident, or description..."
            value={search}
            onChange={onSearchChange}
            containerClassName="flex-1 xl:w-[330px] shrink-0"
          />

          {/* Filter Modal Trigger (Visible on screens below xl:) */}
          <div className="xl:hidden shrink-0">
            <Dialog open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={secondaryFilterCount > 0 ? "primary-outline" : "outline"}
                  className={"h-10 px-3 rounded-xl gap-2 text-xs font-semibold transition-all shadow-2xs"}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[92vw] sm:w-full rounded-2xl border border-border/80 p-5 bg-card shadow-2xl gap-0">
                <DialogHeader className="gw-modal-header text-left pb-3 border-b border-border/60 bg-card">
                  <div className="flex items-center justify-between pr-6">
                    <div>
                      <DialogTitle className="gw-heading text-sm text-foreground flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-primary" />
                        Filter Reports
                      </DialogTitle>
                      <p className="text-ui-caption text-muted-foreground mt-0.5">Refine and narrow table records</p>
                    </div>
                    {secondaryFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSecondary}
                        className="h-7 px-2 text-ui-caption rounded-lg gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                {/* Filter Controls: Balanced 2-Column Grid */}
                <div className="py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Violation Type */}
                    <div className="space-y-1">
                      <label className="text-ui-caption font-medium text-muted-foreground uppercase tracking-wider">Violation</label>
                      <Select value={violationFilter} onValueChange={onViolationFilterChange}>
                        <SelectTrigger className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs">
                          <SelectValue placeholder="All Violations" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">All Violations</SelectItem>
                          {violationTypes.map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Barangay */}
                    <div className="space-y-1">
                      <label className="text-ui-caption font-medium text-muted-foreground uppercase tracking-wider">Barangay</label>
                      <SearchableSelect value={barangayFilter} onValueChange={onBarangayFilterChange}
                        options={[{ value: "all", label: "All Barangays" }, ...barangays.map((b) => ({ value: b.name, label: b.name }))]}
                        placeholder="All Barangays" aria-label="Barangay" searchPlaceholder="Search barangays..." fieldSize="compact"
                        className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Sort Order */}
                    <div className="space-y-1">
                      <label className="text-ui-caption font-medium text-muted-foreground uppercase tracking-wider">Sort Order</label>
                      <Select value={sortBy} onValueChange={onSortByChange}>
                        <SelectTrigger className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="date-desc">Newest First</SelectItem>
                          <SelectItem value="date-asc">Oldest First</SelectItem>
                          <SelectItem value="status">By Status</SelectItem>
                          <SelectItem value="violation">By Violation</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  {/* Date Range (Full Width) */}
                  <div className="space-y-1">
                    <label className="text-ui-caption font-medium text-muted-foreground uppercase tracking-wider">Date Range</label>
                    <Popover open={modalCalendarOpen} onOpenChange={setModalCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={dateRange.from ? "default" : "outline"}
                          className={"h-9 w-full justify-start gap-2 rounded-xl font-body text-xs font-semibold transition-colors"}
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>
                            {dateRange.from
                              ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}`
                              : "Pick a date range"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl shadow-md border-border/80 z-[60]" align="center" side="top">
                        <Calendar
                          mode="range"
                          selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                          onSelect={(range) => {
                            onDateRangeChange({ from: range?.from, to: range?.to });
                          }}
                          numberOfMonths={1}
                          className="rounded-2xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                </div>

                {/* Apply Button */}
                <div className="pt-3 border-t border-border/60">
                  <Button
                    onClick={() => setMobileSheetOpen(false)}
                    className="w-full h-9 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Apply Filters
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ── Secondary Filter Strip (Visible only on XL desktop where all fit in 1 single line) ── */}
      <div className="hidden xl:flex items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="mr-1 inline-flex items-center gap-1.5 text-ui-caption font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </div>

        {/* Violation Type */}
        <Select value={violationFilter} onValueChange={onViolationFilterChange}>
          <SelectTrigger className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl">
            <SelectValue placeholder="Violation Type" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Violations</SelectItem>
            {violationTypes.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

          {/* Barangay */}
          <SearchableSelect value={barangayFilter} onValueChange={onBarangayFilterChange}
            options={[{ value: "all", label: "All Barangays" }, ...barangays.map((b) => ({ value: b.name, label: b.name }))]}
            placeholder="Barangay" aria-label="Barangay" searchPlaceholder="Search barangays..." fieldSize="compact"
            className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl" />

          {/* Date Range Popover */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateRange.from ? "default" : "outline"}
                size="sm"
                className={`h-9 rounded-xl gap-1.5 cursor-pointer font-body text-xs font-semibold transition-colors ${dateRange.from ? "shadow-xs" : ""}`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>
                  {dateRange.from
                    ? `${format(dateRange.from, "MMM d")}${
                        dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""
                      }`
                    : "Date Range"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-md border-border/80" align="start">
              <Calendar
                mode="range"
                selected={
                  dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined
                }
                onSelect={(range) => {
                  onDateRangeChange({ from: range?.from, to: range?.to });
                }}
                numberOfMonths={1}
                className="rounded-2xl"
              />
            </PopoverContent>
          </Popover>

        {/* Clear Filters button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 px-2.5 text-xs rounded-xl gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </Button>
        )}

        {/* Right Side: Sort Control */}
        <div className="ml-auto flex items-center shrink-0">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="violation">By Violation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
};

export default ReportFilters;
