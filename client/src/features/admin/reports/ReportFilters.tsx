import { AdminFilterDialog, AdminFilterField } from "@/components/admin/AdminFilterDialog";
import { SearchInput } from "@/components/common/SearchInput";
import { adminWasteReportStyles as styles } from "@/components/common/communityContentStyles";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

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
import { fetchBarangays } from "@/services/barangaysService";
import type { AdminReportsKPIs } from "@/services/reportsService";
import { format } from "date-fns";
import { ArrowUpDown, Calendar as CalendarIcon, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ViolationType } from "./types";

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
];const ReportFilters = ({
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
    <section className="admin-toolbar min-w-0 rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
      <div className={`${styles.primary} admin-toolbar-primary`}>
        {/* Status filters */}
        <div className="min-w-0 overflow-hidden">
          <FilterPillTabs
            items={STATUS_TABS}
            activeId={statusFilter}
            onChange={onStatusFilterChange}
            ariaLabel="Report status filters"
            className="admin-toolbar-chips overscroll-x-contain"
          />
        </div>

        {/* Search Input + Mobile Filter Sheet Trigger */}
        <div className={`${styles.search} admin-toolbar-search-row`}>
          <SearchInput
            placeholder="Search reference, resident, or description..."
            value={search}
            onChange={onSearchChange}
            containerClassName="min-w-0 flex-1"
          />

          {/* Filter Modal Trigger (Visible on screens below xl:) */}
          <div className={styles.mobileFilters}>
            <AdminFilterDialog title="Filter Reports" className="" activeCount={secondaryFilterCount}
              values={{ violationFilter, barangayFilter, sortBy, dateRange }}
              onApply={(next) => {
                onViolationFilterChange(next.violationFilter);
                onBarangayFilterChange(next.barangayFilter);
                onSortByChange(next.sortBy);
                onDateRangeChange(next.dateRange);
              }}
              resetValues={{ violationFilter: "all", barangayFilter: "all", sortBy: "date-desc", dateRange: {} }}
            >
              {(draft, setDraft) => (
                <>
                  <AdminFilterField label="Violation">
                    <Select value={draft.violationFilter} onValueChange={(value) => setDraft({ ...draft, violationFilter: value })}>
                      <SelectTrigger aria-label="Violation" className="h-9 w-full rounded-xl text-xs">
                        <SelectValue placeholder="All Violations" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Violations</SelectItem>
                        {violationTypes.map((v) => (
                          <SelectItem key={v} value={v}>{v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AdminFilterField>
                  <AdminFilterField label="Barangay">
                    <SearchableSelect value={draft.barangayFilter} onValueChange={(value) => setDraft({ ...draft, barangayFilter: value })}
                      options={[{ value: "all", label: "All Barangays" }, ...barangays.map((b) => ({ value: b.name, label: b.name }))]}
                      placeholder="All Barangays" aria-label="Barangay" searchPlaceholder="Search barangays..." fieldSize="compact"
                      className="h-9 w-full bg-background/80 border-border/80 rounded-xl text-xs" />
                  </AdminFilterField>
                  <AdminFilterField label="Sort order">
                    <Select value={draft.sortBy} onValueChange={(value) => setDraft({ ...draft, sortBy: value })}>
                      <SelectTrigger aria-label="Sort order" className="h-9 w-full rounded-xl text-xs">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="status">By Status</SelectItem>
                        <SelectItem value="violation">By Violation</SelectItem>
                      </SelectContent>
                    </Select>
                  </AdminFilterField>
                  <AdminFilterField label="Date range">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={draft.dateRange.from ? "default" : "outline"}
                          className={"h-9 w-full justify-start gap-2 rounded-xl font-body text-xs font-semibold transition-colors"}
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>
                            {draft.dateRange.from
                              ? `${format(draft.dateRange.from, "MMM d")}${draft.dateRange.to ? ` – ${format(draft.dateRange.to, "MMM d")}` : ""}`
                              : "Pick a date range"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl shadow-md border-border/80 z-[60]" align="center" side="top">
                        <Calendar
                          mode="range"
                          selected={draft.dateRange.from ? { from: draft.dateRange.from, to: draft.dateRange.to } : undefined}
                          onSelect={(range) => {
                            setDraft({ ...draft, dateRange: { from: range?.from, to: range?.to } });
                          }}
                          numberOfMonths={1}
                          className="rounded-2xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </AdminFilterField>
                </>
              )}
            </AdminFilterDialog>
          </div>
        </div>
      </div>

      {/* ── Secondary Filter Strip (Visible only on XL desktop where all fit in 1 single line) ── */}
      <div className={styles.secondary}>
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
                  ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""
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
