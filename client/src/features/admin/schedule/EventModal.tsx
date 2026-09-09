import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  CalendarDays,
  CalendarPlus,
  CalendarCheck,
  Clock,
  ChevronDown,
  X,
  Loader2,
  MapPin,
  Building2,
} from "lucide-react";
import {
  CalendarEvent,
  EventType,
  EventVisibility,
  EventStatus,
  CreateEventPayload,
} from "@/services/scheduleService";
import { BarangayLocationRow } from "@/services/barangaysService";
import { format } from "date-fns";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  defaultDate: string;
  barangays: BarangayLocationRow[];
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
}

const TIME_OPTIONS = [
  { value: "06:00", label: "06:00 AM" },
  { value: "06:30", label: "06:30 AM" },
  { value: "07:00", label: "07:00 AM" },
  { value: "07:30", label: "07:30 AM" },
  { value: "08:00", label: "08:00 AM" },
  { value: "08:30", label: "08:30 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "13:30", label: "01:30 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "17:30", label: "05:30 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "18:30", label: "06:30 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "19:30", label: "07:30 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "20:30", label: "08:30 PM" },
  { value: "21:00", label: "09:00 PM" },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  defaultDate,
  barangays,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("PRIVATE_EVENT");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (!defaultDate) return new Date();
    const parts = defaultDate.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [barangayId, setBarangayId] = useState<string>("NONE");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EventStatus>("UPCOMING");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(event);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setEventType(event.event_type);
      const datePart = typeof event.event_date === "string" ? event.event_date.split("T")[0] : "";
      setEventDate(datePart);
      if (datePart) {
        const parts = datePart.split("-").map(Number);
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
      }
      setStartTime(event.start_time ? event.start_time.slice(0, 5) : "09:00");
      setEndTime(event.end_time ? event.end_time.slice(0, 5) : "11:00");
      setLocation(event.location || "");
      setBarangayId(event.barangay_id || "NONE");
      setDescription(event.description || "");
      setStatus(event.status || "UPCOMING");
    } else {
      setTitle("");
      setEventType("PRIVATE_EVENT");
      setEventDate(defaultDate);
      if (defaultDate) {
        const parts = defaultDate.split("-").map(Number);
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
      } else {
        setSelectedDate(new Date());
      }
      setStartTime("09:00");
      setEndTime("11:00");
      setLocation("");
      setBarangayId("NONE");
      setDescription("");
      setStatus("UPCOMING");
    }
  }, [event, defaultDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for this schedule.");
      return;
    }
    if (!eventDate) {
      toast.error("Please select a valid scheduled date.");
      return;
    }

    try {
      setIsSubmitting(true);
      const visibility: EventVisibility =
        eventType === "PRIVATE_EVENT" ? "PRIVATE" : "PUBLIC";

      const payload: CreateEventPayload = {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        start_time: startTime ? `${startTime}:00` : null,
        end_time: endTime ? `${endTime}:00` : null,
        event_type: eventType,
        visibility,
        location: location.trim() || null,
        barangay_id: eventType === "PRIVATE_EVENT" || barangayId === "NONE" ? null : barangayId,
        status,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Failed to submit schedule event", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = useMemo(() => {
    if (event) {
      const origDate = typeof event.event_date === "string" ? event.event_date.split("T")[0] : "";
      const origStart = event.start_time ? event.start_time.slice(0, 5) : "09:00";
      const origEnd = event.end_time ? event.end_time.slice(0, 5) : "11:00";
      return (
        title !== event.title ||
        eventType !== event.event_type ||
        eventDate !== origDate ||
        startTime !== origStart ||
        endTime !== origEnd ||
        location !== (event.location || "") ||
        barangayId !== (event.barangay_id || "NONE") ||
        description !== (event.description || "") ||
        status !== (event.status || "UPCOMING")
      );
    }
    return (
      title.trim() !== "" ||
      location.trim() !== "" ||
      description.trim() !== "" ||
      barangayId !== "NONE" ||
      eventType !== "PRIVATE_EVENT" ||
      startTime !== "09:00" ||
      endTime !== "11:00"
    );
  }, [event, title, eventType, eventDate, startTime, endTime, location, barangayId, description, status]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleRequestClose()}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            {/* Header (Pinned / Non-scrollable) */}
            <div className="p-5 sm:p-6 pb-3.5 border-b border-border/60 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  {isEditing ? (
                    <CalendarCheck className="w-4 h-4" />
                  ) : (
                    <CalendarPlus className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                    {isEditing ? "Edit Schedule Event" : "Create Schedule / Event"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {isEditing
                      ? "Modify schedule details, date/time, and visibility."
                      : "Register a department task or public community program."}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* Form Fields (Scrollable Body) */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Event Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly Staff Review, Coastal Clean-Up Drive"
                className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20"
                maxLength={255}
                required
              />
            </div>

            {/* Category / Visibility */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Category & Visibility <span className="text-destructive">*</span>
              </Label>
              <Select
                value={eventType}
                onValueChange={(val: EventType) => setEventType(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="PRIVATE_EVENT" className="text-xs">
                    MENRO Private (Internal Only · Hidden from Residents)
                  </SelectItem>
                  <SelectItem value="COMMUNITY_EVENT" className="text-xs">
                    Public Community Event (Visible on Resident Calendar)
                  </SelectItem>
                  <SelectItem value="COLLECTION_SCHEDULE" className="text-xs">
                    Collection Route Schedule (Published Timetable)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date, Start Time & End Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Date Dropdown (Popover Calendar) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-background px-3 text-xs shadow-2xs hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">
                          {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select date"}
                        </span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (d) {
                          setSelectedDate(d);
                          setEventDate(
                            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                          );
                          setIsDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Start Time Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Start time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-56 rounded-xl">
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* End Time Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="End time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-56 rounded-xl">
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Venue / Location & Optional Target Barangay (Public / Community Only) */}
            <div
              className={cn(
                "grid gap-2.5 transition-all",
                eventType === "PRIVATE_EVENT" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
              )}
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Venue / Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={
                      eventType === "PRIVATE_EVENT"
                        ? "e.g. MENRO Conference Room, Admin Office, MRF Facility"
                        : "e.g. Municipal Plaza, Barangay Covered Court"
                    }
                    className="h-9 pl-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              {eventType !== "PRIVATE_EVENT" && (
                <div className="space-y-1.5 animate-in fade-in-50 duration-200">
                  <Label className="text-xs font-semibold text-foreground">Target Barangay</Label>
                  <Select value={barangayId} onValueChange={setBarangayId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-56 rounded-xl">
                      <SelectItem value="NONE" className="text-xs">
                        Municipality Wide (All Sectors)
                      </SelectItem>
                      {barangays.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Description & Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Description & Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specific instructions, agenda items, or reminders..."
                rows={2}
                className="text-xs rounded-xl resize-none bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20"
              />
            </div>

            {/* Status (Only displayed when Editing an existing event to avoid cluttering creation) */}
            {isEditing && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-foreground">Status</Label>
                <Select value={status} onValueChange={(val: EventStatus) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="UPCOMING" className="text-xs">Upcoming (Scheduled)</SelectItem>
                    <SelectItem value="ONGOING" className="text-xs">In Progress (Active Today)</SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">Completed</SelectItem>
                    <SelectItem value="CANCELLED" className="text-xs">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Footer (Pinned / Sticky) */}
          <div className="p-4 sm:p-5 sm:px-6 border-t border-border/60 shrink-0 bg-muted/10 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* ── Universal Unsaved Changes Guard Dialog ── */}
    <UnsavedChangesDialog
      isOpen={showDiscardConfirm}
      onClose={() => setShowDiscardConfirm(false)}
      onDiscard={() => {
        setShowDiscardConfirm(false);
        onClose();
      }}
      title="Discard Unsaved Changes?"
      description="You have unsaved edits in this schedule event. If you close now, all your entered information will be discarded."
      discardLabel="Discard Changes"
      keepEditingLabel="Keep Editing"
    />
  </>
  );
};
