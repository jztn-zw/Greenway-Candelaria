import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { getEventColors, getManilaCalendarDate, calendarDateKey, eventOccursOnDate } from "@/components/calendar/calendar.utils";
import { AdminScheduleSkeleton } from "@/components/PageLoadingSkeletons";
import { SearchInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { adminCommunityStyles as managerStyles, adminScheduleStyles as scheduleStyles } from "@/components/communityContentStyles";

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
import { AlertCircle, CalendarDays, Plus } from "lucide-react";
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
      toast.success("Schedule Event Updated Successfully");
    } else {
      await createCalendarEvent(payload);
      toast.success("New Schedule Event added to MENRO Calendar");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;
    try {
      setIsDeleting(true);
      await deleteCalendarEvent(deletingEvent.id);
      toast.success("Schedule Event Removed from Calendar");
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
    return <AdminScheduleSkeleton currentDate={currentDate} />;
  }
  if (eventsQuery.error && eventsQuery.data === undefined && !isModalOpen) return <PageErrorState kind="unavailable" description="We couldn't load the Internal Schedule. Please try again." onRetry={() => void eventsQuery.refetch()} retrying={eventsQuery.isFetching} homeHref="/admin" />;

  return (
    <div className={scheduleStyles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title="Schedule Manager"
        description="Plan MENRO activities. Manage Resident Collection Days in Route Manager."
        actionsClassName="admin-module-header-actions"
        actions={<Button
          onClick={handleOpenCreate}
          className={`${managerStyles.action} shrink-0`}
        >
          <Plus className="w-4 h-4" />
          <span>New Internal Schedule</span>
        </Button>}
      />

      {eventsQuery.error && <DataRefreshNotice message="Couldn't refresh the schedule. Your current work is preserved; loaded events may be outdated." onRetry={() => void eventsQuery.refetch()} retrying={eventsQuery.isFetching} />}

      {/* Schedule summary */}
      <ScheduleKPIs events={events} />

      <section className={scheduleStyles.workspace} aria-labelledby="internal-calendar-title">
        <div className={scheduleStyles.workspaceHeader}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="internal-calendar-title" className="gw-heading text-sm text-foreground">Internal Calendar</h2>
              <p className="mt-0.5 text-ui-caption text-muted-foreground">Select a Date to View its Activities.</p>
            </div>
          </div>
          <div className={scheduleStyles.toolbar}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search Internal Schedule Title or Venue..."
              containerClassName={scheduleStyles.search}
            />
          </div>
        </div>

        {/* Calendar and selected-day activities */}
        <div className={`${scheduleStyles.layout} p-3 sm:p-5`}>
          <div className="min-w-0">
            <CalendarGrid
              className={scheduleStyles.calendar}
              headingLabel={currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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

          <div className="min-w-0">
            <SelectedDayPanel
              className={scheduleStyles.dayPanel}
              variant="admin"
              selectedDateStr={selectedDateStr}
              events={selectedDayEvents}
              scheduleColorById={scheduleColorById}
              onEditEvent={handleOpenEdit}
              onDeleteEvent={setDeletingEvent}
            />
          </div>
        </div>
      </section>
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
        description={<>Are you sure you want to Permanently Remove <strong className="font-semibold text-foreground">&ldquo;{deletingEvent?.title}&rdquo;</strong>? This will Remove the Rvent from both Administrative Tracking and the Resident Community Portal. This Action cannot be undone.</>}
        confirmLabel="Delete Event"
        isPending={isDeleting}
        pendingLabel="Deleting..."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default AdminCollectionSchedule;
