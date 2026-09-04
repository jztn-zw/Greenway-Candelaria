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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { ViolationType, ReportStatus, ReportPriority } from "./types";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";
import type { AdminReportsKPIs } from "@/services/reportsService";

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

  const activeFilterCount = [
    search.trim().length > 0,
    statusFilter !== "all",
    violationFilter !== "all" ||
      barangayFilter !== "all" ||
      priorityFilter !== "all" ||
      Boolean(dateRange.from || dateRange.to),
  ].filter(Boolean).length;

  const clearAll = () => {
    onViolationFilterChange("all");
    onStatusFilterChange("all");
    onBarangayFilterChange("all");
    onPriorityFilterChange("all");
    onDateRangeChange({});
    onSearchChange("");
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
        {/* Status Pills with count badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x">
            {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusFilterChange(tab.key)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-95 shrink-0 ${
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

        {/* Search Input */}
        <div className="relative w-full xl:w-[330px] shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search reference, resident, or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-9 h-10 bg-background/70 border-border/90 rounded-xl text-xs shadow-inner shadow-black/5 focus-visible:ring-primary/30"
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
      </div>

      {/* ── Secondary Filter Strip ── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
          <SelectTrigger className="h-9 text-xs w-auto min-w-[140px] bg-card border-border/80 rounded-xl">
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
          <SelectTrigger className="h-9 text-xs w-auto min-w-[140px] bg-card border-border/80 rounded-xl">
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

        <div className="ml-auto flex items-center gap-2">
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
