import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { getEventColors, getManilaCalendarDate, calendarDateKey, eventOccursOnDate } from "@/components/calendar/calendar.utils";
import { PageHeaderSkeleton, ScheduleGridSkeleton } from "@/components/PageLoadingSkeletons";
import { SearchInput } from "@/components/common";
import { Button } from "@/components/ui/button";

import { useAdminMutation, useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import {
createCalendarEvent as apicreateCalendarEvent,
deleteCalendarEvent as apideleteCalendarEvent,
updateCalendarEvent as apiupdateCalendarEvent,
CalendarEvent,
CreateEventPayload,
fetchCalendarEvents,
} from "@/services/scheduleService";
import { AlertCircle, Plus, RotateCcw } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventDetailModal } from "./EventDetailModal";
import { EventModal } from "./EventModal";
import { ScheduleKPIs } from "./ScheduleKPIs";
import { SelectedDayPanel } from "@/components/calendar/SelectedDayPanel";

const AdminCollectionSchedule: React.FC = () => {
  const createCalendarEvent = useAdminMutation(apicreateCalendarEvent, "schedule");
  const updateCalendarEvent = useAdminMutation(apiupdateCalendarEvent, "schedule");
  const deleteCalendarEvent = useAdminMutation(apideleteCalendarEvent, "schedule");
  const eventsQuery = useAdminQuery("schedule", ["private-events"], () => fetchCalendarEvents({ event_type: "PRIVATE_EVENT", visibility: "PRIVATE" }));
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const isLoading = eventsQuery.isLoading;

  const [searchQuery, setSearchQuery] = useState("");

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState(getManilaCalendarDate);
  const [selectedDateStr, setSelectedDateStr] = useState(() => calendarDateKey(getManilaCalendarDate()));

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingDetailEvent, setViewingDetailEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const scheduleColorById = useMemo(() => getEventColors(events), [events]);

  useEffect(() => { if (eventsQuery.error) toast.error("Failed to fetch schedule data"); }, [eventsQuery.error]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
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
  }, [events, searchQuery]);

  // Selected Day's events
  const selectedDayEvents = useMemo(() => {
      return filteredEvents.filter((e) => {
        return eventOccursOnDate(e, selectedDateStr);
      });
  }, [filteredEvents, selectedDateStr]);

  const hasActiveFilters = searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setSearchQuery("");
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            Schedule Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Plan internal MENRO activities. Resident collection days are managed in Route Manager.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 px-4 rounded-xl font-semibold shadow-xs active:scale-95 cursor-pointer text-xs shrink-0 self-start sm:self-auto gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Internal Schedule</span>
        </Button>
      </div>

      {/* ── 4 Bento Metric Cards ── */}
      <ScheduleKPIs events={events} />

      {/* ── Search Toolbar ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
               placeholder="Search internal schedule title or venue..."
              containerClassName="w-full sm:max-w-xs md:max-w-sm"
            />

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

      {/* ── Calendar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <CalendarGrid
              className="lg:h-[620px]"
              fillHeight
              compactMobileCells
              currentDate={currentDate}
              selectedDateStr={selectedDateStr}
              events={filteredEvents}
              scheduleColorById={scheduleColorById}
              onSelectDate={setSelectedDateStr}
              onPrevMonth={() => {
                const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
                setCurrentDate(previousMonth);
                setSelectedDateStr(`${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}-01`);
              }}
              onNextMonth={() => {
                const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                setCurrentDate(nextMonth);
                setSelectedDateStr(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`);
              }}
              onGoToday={() => {
                const today = getManilaCalendarDate();
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
              scheduleColorById={scheduleColorById}
              onEditEvent={handleOpenEdit}
              onDeleteEvent={setDeletingEvent}
            />
          </div>
        </div>
      {/* ── Create / Edit Event Modal ── */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={editingEvent}
        defaultDate={selectedDateStr}
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
      <ConfirmationDialog
        kind="dialog"
        open={!!deletingEvent}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
        title="Confirm Event Deletion"
        icon={<AlertCircle />}
        variant="destructive"
        description={<>Are you sure you want to permanently remove <strong className="font-semibold text-foreground">&ldquo;{deletingEvent?.title}&rdquo;</strong>? This will remove the event from both administrative tracking and the resident community portal. This action cannot be undone.</>}
        confirmLabel="Delete Event"
        isPending={isDeleting}
        pendingLabel="Deleting..."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default AdminCollectionSchedule;
