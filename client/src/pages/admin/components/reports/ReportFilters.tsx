import { Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState } from "react";
import { ViolationType, ReportStatus, ReportPriority } from "./types";
import { violationTypes, barangayList } from "./mockData";

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
}

const statuses: ReportStatus[] = ["Submitted", "Under Review", "Dispatched", "Resolved"];
const priorities: ReportPriority[] = ["High", "Medium", "Low"];

const ReportFilters = ({
  search, onSearchChange,
  violationFilter, onViolationFilterChange,
  statusFilter, onStatusFilterChange,
  barangayFilter, onBarangayFilterChange,
  priorityFilter, onPriorityFilterChange,
  sortBy, onSortByChange,
  dateRange, onDateRangeChange,
}: ReportFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const activeFilters = [
    violationFilter !== "all" ? violationFilter : null,
    statusFilter !== "all" ? statusFilter : null,
    barangayFilter !== "all" ? barangayFilter : null,
    priorityFilter !== "all" ? priorityFilter : null,
    dateRange.from ? `From ${format(dateRange.from, "MMM d")}` : null,
    dateRange.to ? `To ${format(dateRange.to, "MMM d")}` : null,
  ].filter(Boolean);

  const clearAll = () => {
    onViolationFilterChange("all");
    onStatusFilterChange("all");
    onBarangayFilterChange("all");
    onPriorityFilterChange("all");
    onDateRangeChange({});
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by reference number or barangay..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 bg-card border-border"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="font-medium">Filters</span>
        </div>

        <Select value={violationFilter} onValueChange={onViolationFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[130px] bg-card">
            <SelectValue placeholder="Violation Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Violations</SelectItem>
            {violationTypes.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[120px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={barangayFilter} onValueChange={onBarangayFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[150px] bg-card">
            <SelectValue placeholder="Barangay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Barangays</SelectItem>
            {barangayList.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[100px] bg-card">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-card">
              {dateRange.from
                ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}`
                : "Date Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
              onSelect={(range) => {
                onDateRangeChange({ from: range?.from, to: range?.to });
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[120px] bg-card">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="violation">By Violation</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
              {f}
            </Badge>
          ))}
          <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-1">
            <X className="w-3 h-3" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
