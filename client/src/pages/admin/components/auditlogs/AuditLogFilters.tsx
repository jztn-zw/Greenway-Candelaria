import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import { moduleList, actionTypes, adminNames } from "./mockData";

interface AuditLogFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  moduleFilter: string;
  onModuleFilterChange: (val: string) => void;
  actionFilter: string;
  onActionFilterChange: (val: string) => void;
  adminFilter: string;
  onAdminFilterChange: (val: string) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
}

const AuditLogFilters = ({
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  actionFilter,
  onActionFilterChange,
  adminFilter,
  onAdminFilterChange,
  dateRange,
  onDateRangeChange,
}: AuditLogFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const activeFilters = [
    moduleFilter !== "all" ? moduleFilter : null,
    actionFilter !== "all" ? actionFilter : null,
    adminFilter !== "all" ? adminFilter : null,
    dateRange.from ? `From ${format(dateRange.from, "MMM d")}` : null,
    dateRange.to ? `To ${format(dateRange.to, "MMM d")}` : null,
  ].filter(Boolean);

  const clearAll = () => {
    onModuleFilterChange("all");
    onActionFilterChange("all");
    onAdminFilterChange("all");
    onDateRangeChange({});
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by admin name or record reference..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 bg-card border-border"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="font-medium">Filters</span>
        </div>

        <Select value={moduleFilter} onValueChange={onModuleFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[130px] bg-card">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {moduleList.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={onActionFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[130px] bg-card">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={adminFilter} onValueChange={onAdminFilterChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[140px] bg-card">
            <SelectValue placeholder="Admin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Admins</SelectItem>
            {adminNames.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
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
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <Badge
              key={f}
              variant="secondary"
              className="text-[10px] px-2 py-0.5 gap-1"
            >
              {f}
            </Badge>
          ))}
          <button
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-1"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogFilters;
