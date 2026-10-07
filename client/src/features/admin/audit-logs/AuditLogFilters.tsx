import { toManilaCalendarDate } from "@/utils/date";
import { AdminFilterDialog, AdminFilterField } from "@/components/admin/AdminFilterDialog";
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
import { format, startOfDay, subDays } from "date-fns";
import { useState } from "react";
import { adminAuditLogStyles as styles } from "@/components/common/communityContentStyles";

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
  { id: "7", label: "7 Days" },
  { id: "30", label: "30 Days" },
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
    const today = startOfDay(toManilaCalendarDate());
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
    const today = startOfDay(toManilaCalendarDate());
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
    <div className={`${styles.toolbar} admin-toolbar admin-toolbar-audit`}>
      <div className={styles.controls}>
        {/* ── Left Controls: Search Bar + All Modules Dropdown ── */}
        <div className={`${styles.fields} admin-toolbar-search-row`}>
          {/* Search Bar */}
          <SearchInput
            placeholder="Search by action, user, module, or target ID…" compactPlaceholder="Action, user, or ID…"
            value={search}
            onChange={onSearchChange}
            containerClassName={styles.search}
          />
          <AdminFilterDialog title="Filter Audit Logs" activeCount={Number(moduleFilter !== "all") + Number(Boolean(dateRange.from || dateRange.to))}
            values={{ moduleFilter, dateRange }}
            onApply={(next) => {
              onModuleFilterChange(next.moduleFilter);
              onDateRangeChange(next.dateRange);
            }}
            resetValues={{ moduleFilter: "all", dateRange: {} }}
          >
            {(draft, setDraft) => (
              <>
                <AdminFilterField label="Module">
                  <SearchableSelect value={draft.moduleFilter} onValueChange={(value) => setDraft({ ...draft, moduleFilter: value })}
                    options={MODULE_OPTIONS} placeholder="All Modules" aria-label="Module" searchPlaceholder="Search by module name…" compactSearchPlaceholder="Module name…"
                    className={styles.module} />
                </AdminFilterField>
                <AdminFilterField label="Date Range">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={draft.dateRange.from ? "default" : "outline"}
                        size="sm"
                        className="h-9 w-full justify-start gap-2 rounded-xl text-xs"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>
                          {draft.dateRange.from
                            ? `${format(draft.dateRange.from, "MMM d")}${draft.dateRange.to ? ` – ${format(draft.dateRange.to, "MMM d")}` : ""}`
                            : "Date Range"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="audit-log-calendar w-auto max-w-[calc(100vw-1.5rem)] p-0 rounded-2xl shadow-md border-border/80"
                      align="end"
                    >
                      <Calendar
                        mode="range"
                        selected={
                          draft.dateRange.from
                            ? { from: draft.dateRange.from, to: draft.dateRange.to }
                            : undefined
                        }
                        onSelect={(range) => {
                          setDraft({ ...draft, dateRange: { from: range?.from, to: range?.to } });
                        }}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                </AdminFilterField>
              </>
            )}
          </AdminFilterDialog>

          {/* All Modules Dropdown */}
          <div className="admin-toolbar-desktop-only">
            <SearchableSelect value={moduleFilter} onValueChange={onModuleFilterChange}
              options={MODULE_OPTIONS} placeholder="All Modules" aria-label="Module" searchPlaceholder="Search by module name…" compactSearchPlaceholder="Module name…"
              className={styles.module} />
          </div>
        </div>

        {/* ── Right Controls: Quick Date Pill + Custom Calendar + Reset ── */}
        <div className={styles.actions}>
          <FilterPillTabs
            items={DATE_PRESETS}
            activeId={DATE_PRESETS.find(({ id }) => isPresetActive(Number(id)))?.id}
            onChange={(id) => handlePresetClick(Number(id))}
            ariaLabel="Audit log date presets"
            className={`${styles.presets} admin-toolbar-chips`}
          />

          {/* Custom Date Range Popover Button */}
          <div className="admin-toolbar-desktop-only">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={isCustomDateSelected ? "default" : "outline"}
                  size="sm"
                  className={`${styles.date} ${isCustomDateSelected ? "shadow-xs" : ""}`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>
                    {isCustomDateSelected && dateRange.from
                      ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` – ${format(dateRange.to, "MMM d")}` : ""}`
                      : "Date Range"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="audit-log-calendar w-auto max-w-[calc(100vw-1.5rem)] p-0 rounded-2xl shadow-md border-border/80"
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
          </div>

          {/* 1-Click Reset */}
          <div className="admin-toolbar-desktop-only">{hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className={styles.reset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogFilters;
