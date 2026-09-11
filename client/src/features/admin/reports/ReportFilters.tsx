import { Search, SlidersHorizontal, ArrowUpDown, X, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { ViolationType, ReportStatus, ReportPriority } from "./types";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";
import type { AdminReportsKPIs } from "@/services/reportsService";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  violationFilter: string;
  onViolationFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  barangayFilter: string;
  onBarangayFilterChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
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
const priorities: ReportPriority[] = ["High", "Medium", "Low"];

const ReportFilters = ({
  search,
  onSearchChange,
  violationFilter,
  onViolationFilterChange,
  statusFilter,
  onStatusFilterChange,
  barangayFilter,
  onBarangayFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortByChange,
  dateRange,
  onDateRangeChange,
  kpis,
  total = 0,
}: ReportFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [modalCalendarOpen, setModalCalendarOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [barangays, setBarangays] = useState<BarangayLocationRow[]>([]);

  useEffect(() => {
    fetchBarangays()
      .then((data) => setBarangays(data))
      .catch(() => setBarangays([]));
  }, []);

  const totalCount = kpis ? kpis.total : total;

  const STATUS_TABS: { key: string; label: string; count?: number }[] = [
    { key: "all", label: "All Reports", count: totalCount },
    { key: "Submitted", label: "Submitted", count: kpis?.submitted },
    { key: "Under Review", label: "Under Review", count: kpis?.under_review },
    { key: "Dispatched", label: "Dispatched", count: kpis?.dispatched },
    { key: "Resolved", label: "Resolved", count: kpis?.resolved },
  ];

  const secondaryFilterCount = [
    violationFilter !== "all",
    barangayFilter !== "all",
    priorityFilter !== "all",
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
    onPriorityFilterChange("all");
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
        {/* Status Pills with count badges (Smooth swipeable snap carousel on mobile) */}
        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x snap-x snap-mandatory scroll-smooth overscroll-x-contain">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.key)}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-95 shrink-0 snap-start select-none ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25"
                      : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <span>{tab.key === "all" ? "All" : tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full leading-none font-bold text-[10px] ${
                        tab.count > 9 ? "h-5 min-w-5 px-1.5" : "w-5 h-5"
                      } ${
                        isActive
                          ? "bg-primary-foreground text-primary"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input + Mobile Filter Sheet Trigger */}
        <div className="flex items-center gap-2 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-[330px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search reference, resident, or description..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-9 h-10 bg-background border-input/80 rounded-xl text-xs shadow-2xs hover:border-primary/50 focus-visible:border-primary w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Modal Trigger (Visible on screens below xl:) */}
          <div className="xl:hidden shrink-0">
            <Dialog open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 px-3 rounded-xl gap-2 text-xs font-semibold border-border/80 bg-card hover:bg-muted/60 active:scale-95 transition-all shadow-2xs",
                    secondaryFilterCount > 0 && "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {secondaryFilterCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {secondaryFilterCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[92vw] sm:w-full rounded-2xl border border-border/80 p-5 bg-card/95 backdrop-blur-md shadow-2xl gap-0">
                <DialogHeader className="text-left pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between pr-6">
                    <div>
                      <DialogTitle className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-primary" />
                        Filter Reports
                      </DialogTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Refine and narrow table records</p>
                    </div>
                    {secondaryFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSecondary}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground rounded-lg gap-1 hover:bg-muted/60 cursor-pointer"
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
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Violation</label>
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
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Barangay</label>
                      <Select value={barangayFilter} onValueChange={onBarangayFilterChange}>
                        <SelectTrigger className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs">
                          <SelectValue placeholder="All Barangays" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-56">
                          <SelectItem value="all">All Barangays</SelectItem>
                          {barangays.map((b) => (
                            <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Priority */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                      <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
                        <SelectTrigger className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs">
                          <SelectValue placeholder="All Priority" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">All Priority</SelectItem>
                          {priorities.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sort Order</label>
                      <Select value={sortBy} onValueChange={onSortByChange}>
                        <SelectTrigger className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="date-desc">Newest First</SelectItem>
                          <SelectItem value="date-asc">Oldest First</SelectItem>
                          <SelectItem value="status">By Status</SelectItem>
                          <SelectItem value="violation">By Violation</SelectItem>
                          <SelectItem value="priority">By Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date Range (Full Width) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date Range</label>
                    <Popover open={modalCalendarOpen} onOpenChange={setModalCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-9 w-full justify-start text-xs rounded-xl gap-2 font-medium bg-background/80 border-border/80",
                            dateRange.from && "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                          )}
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>
                            {dateRange.from
                              ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}`
                              : "Pick a date range"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border/80 z-[60]" align="center" side="top">
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
        <div className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="h-4 min-w-4 justify-center rounded-full border-0 bg-primary/15 px-1 text-[9px] text-primary hover:bg-primary/15">
              {activeFilterCount}
            </Badge>
          )}
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
          <Select value={barangayFilter} onValueChange={onBarangayFilterChange}>
            <SelectTrigger className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl">
              <SelectValue placeholder="Barangay" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Barangays</SelectItem>
              {barangays.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="h-9 text-xs w-auto min-w-[110px] bg-card border-border/80 rounded-xl">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Priority</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Popover */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs rounded-xl gap-1.5 cursor-pointer font-medium transition-all ${
                  dateRange.from
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs"
                    : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 shadow-2xs"
                }`}
              >
                <CalendarIcon className={`w-3.5 h-3.5 ${dateRange.from ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                <span>
                  {dateRange.from
                    ? `${format(dateRange.from, "MMM d")}${
                        dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""
                      }`
                    : "Date Range"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/80" align="start">
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
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
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
              <SelectItem value="priority">By Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
};

export default ReportFilters;
