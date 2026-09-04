import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  AlertCircle,
  RotateCcw,
  LayoutGrid,
  List,
  Truck,
  X,
} from "lucide-react";
import { PageHeaderSkeleton, ScheduleGridSkeleton } from "@/components/PageLoadingSkeletons";
import {
  SearchInput,
  FilterPillTabs,
  FilterPillItem,
  SegmentedControl,
  SegmentedControlOption,
} from "@/components/common";
import {
  CalendarEvent,
  EventType,
  EventStatus,
  CreateEventPayload,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchReminderSettings,
} from "@/services/scheduleService";
import { fetchBarangays, BarangayLocationRow } from "@/services/barangaysService";
import { toast } from "sonner";
import { ScheduleKPIs } from "./ScheduleKPIs";
import { CalendarGrid } from "./CalendarGrid";
import { SelectedDayPanel } from "./SelectedDayPanel";
import { ScheduleAgendaView } from "./ScheduleAgendaView";
import { WeeklyRules } from "./WeeklyRules";
import { EventModal } from "./EventModal";
import { EventDetailModal } from "./EventDetailModal";

type ViewMode = "GRID" | "AGENDA" | "RULES";

const AdminCollectionSchedule: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [barangays, setBarangays] = useState<BarangayLocationRow[]>([]);
  const [reminderTiming, setReminderTiming] = useState("3h");

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | EventType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EventStatus>("ALL");

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingDetailEvent, setViewingDetailEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const [evts, brgys, reminders] = await Promise.all([
        fetchCalendarEvents(),
        fetchBarangays().catch(() => []),
        fetchReminderSettings().catch(() => null),
      ]);
      setEvents(evts);
      setBarangays(brgys);
      if (reminders && reminders.timing) {
        setReminderTiming(reminders.timing >= 24 ? "1d" : `${reminders.timing}h`);
      }
    } catch (err) {
      console.error("Failed to load schedule data", err);
      toast.error("Failed to fetch schedule data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: events.length,
      private: events.filter((e) => e.event_type === "PRIVATE_EVENT").length,
      community: events.filter((e) => e.event_type === "COMMUNITY_EVENT").length,
      collection: events.filter((e) => e.event_type === "COLLECTION_SCHEDULE").length,
    };
  }, [events]);

  const categoryTabs: FilterPillItem<"ALL" | EventType>[] = useMemo(
    () => [
      { id: "ALL", label: "All Events", count: counts.all },
      { id: "PRIVATE_EVENT", label: "MENRO Private", count: counts.private },
      { id: "COMMUNITY_EVENT", label: "Public Community", count: counts.community },
      { id: "COLLECTION_SCHEDULE", label: "Collection Routes", count: counts.collection },
    ],
    [counts]
  );

  const viewOptions: SegmentedControlOption<ViewMode>[] = [
    { id: "GRID", label: "Month Grid", icon: LayoutGrid },
    { id: "AGENDA", label: "Agenda List", icon: List },
    { id: "RULES", label: "Weekly Rules", icon: Truck },
  ];

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Type filter
      if (typeFilter !== "ALL" && e.event_type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (e.title || "").toLowerCase().includes(query);
        const matchDesc = (e.description || "").toLowerCase().includes(query);
        const matchLoc = (e.location || "").toLowerCase().includes(query);
        const matchBrgy = (e.barangay_name || "").toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchLoc && !matchBrgy) return false;
      }

      return true;
    });
  }, [events, typeFilter, statusFilter, searchQuery]);

  // Selected Day's events
  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter((e) => {
      const eDate = typeof e.event_date === "string" ? e.event_date.split("T")[0] : "";
      return eDate === selectedDateStr;
    });
  }, [filteredEvents, selectedDateStr]);

  const hasActiveFilters = searchQuery.trim() !== "" || typeFilter !== "ALL" || statusFilter !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setIsModalOpen(true);
  };

  const handleSubmitEvent = async (payload: CreateEventPayload) => {
    if (editingEvent) {
      await updateCalendarEvent(editingEvent.id, payload);
      toast.success("Schedule event updated successfully");
    } else {
      await createCalendarEvent(payload);
      toast.success("New schedule event added to MENRO calendar");
    }
    await loadData(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;
    try {
      setIsDeleting(true);
      await deleteCalendarEvent(deletingEvent.id);
      toast.success("Schedule event removed from calendar");
      setDeletingEvent(null);
      if (viewingDetailEvent?.id === deletingEvent.id) {
        setViewingDetailEvent(null);
      }
      await loadData(true);
    } catch (err) {
      toast.error("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
        <PageHeaderSkeleton showButton={true} />
        <ScheduleGridSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Schedule Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage internal MENRO schedules, public community events, and collection timetables.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 px-4 rounded-xl font-semibold shadow-xs active:scale-95 cursor-pointer text-xs shrink-0 self-start sm:self-auto gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule / Event</span>
        </Button>
      </div>

      {/* ── 4 Bento Metric Cards ── */}
      <ScheduleKPIs events={events} />

      {/* ── Standardized 2-Tier Filter Card Container ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        {/* Tier 1: Category Scope Pills & View Mode Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
          <FilterPillTabs<"ALL" | EventType>
            items={categoryTabs}
            activeId={typeFilter}
            onChange={(id) => setTypeFilter(id)}
          />

          <SegmentedControl<ViewMode>
            options={viewOptions}
            value={viewMode}
            onChange={(mode) => setViewMode(mode)}
            className="self-start sm:self-auto shrink-0"
          />
        </div>

        {/* Tier 2: Search Input + Status Filter + Live Count & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search event title, venue, barangay..."
              containerClassName="w-full sm:max-w-xs md:max-w-sm"
            />

            <Select
              value={statusFilter}
              onValueChange={(val: "ALL" | EventStatus) => setStatusFilter(val)}
            >
              <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-card border-border/80 shrink-0">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="ONGOING">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl shrink-0 gap-1.5 cursor-pointer active:scale-95 transition-all hover:bg-muted/50"
              title="Reset active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </section>

      {/* ── Main View Content (Based on Selected ViewMode) ── */}
      {viewMode === "GRID" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <CalendarGrid
              currentDate={currentDate}
              selectedDateStr={selectedDateStr}
              events={filteredEvents}
              onSelectDate={setSelectedDateStr}
              onViewEvent={(e) => setViewingDetailEvent(e)}
              onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              onGoToday={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedDateStr(
                  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                );
              }}
            />
          </div>

          <div className="lg:col-span-1">
            <SelectedDayPanel
              selectedDateStr={selectedDateStr}
              events={selectedDayEvents}
              onViewEvent={(e) => setViewingDetailEvent(e)}
              onEditEvent={handleOpenEdit}
              onDeleteEvent={setDeletingEvent}
            />
          </div>
        </div>
      )}

      {viewMode === "AGENDA" && (
        <ScheduleAgendaView
          events={filteredEvents}
          onViewEvent={(e) => setViewingDetailEvent(e)}
          onEditEvent={handleOpenEdit}
          onDeleteEvent={setDeletingEvent}
        />
      )}

      {viewMode === "RULES" && (
        <WeeklyRules initialReminderTiming={reminderTiming} />
      )}

      {/* ── Create / Edit Event Modal ── */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={editingEvent}
        defaultDate={selectedDateStr}
        barangays={barangays}
        onSubmit={handleSubmitEvent}
      />

      {/* ── Event Detail Modal ── */}
      <EventDetailModal
        event={viewingDetailEvent}
        isOpen={!!viewingDetailEvent}
        onClose={() => setViewingDetailEvent(null)}
        onEdit={handleOpenEdit}
        onDelete={setDeletingEvent}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Confirm Event Deletion
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeletingEvent(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-foreground">"{deletingEvent?.title}"</strong>? This will remove the event from both administrative tracking and the resident community portal.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingEvent(null)}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs active:scale-95 gap-1.5"
            >
              {isDeleting ? "Deleting..." : "Delete Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCollectionSchedule;
