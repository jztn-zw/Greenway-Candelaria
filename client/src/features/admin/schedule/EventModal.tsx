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
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import {
  CalendarEvent,
  CreateEventPayload,
} from "@/services/scheduleService";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  defaultDate: string;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
}

type FormErrors = Partial<Record<"title" | "eventDate" | "endDate" | "form", string>>;

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  defaultDate,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (!defaultDate) return new Date();
    const parts = defaultDate.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const selectedEndDate = useMemo(() => {
    if (!endDate) return undefined;
    const parts = endDate.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return undefined;
  }, [endDate]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const todayDate = format(today, "yyyy-MM-dd");

  const isEditing = Boolean(event);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      const datePart = typeof event.event_date === "string" ? event.event_date.split("T")[0] : "";
      setEventDate(datePart);
      if (datePart) {
        const parts = datePart.split("-").map(Number);
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
      }
      setEndDate(event.end_date ? event.end_date.split("T")[0] : "");
      setDescription(event.description || "");
    } else {
      setTitle("");
      setEventDate(defaultDate);
      if (defaultDate) {
        const parts = defaultDate.split("-").map(Number);
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
      } else {
        setSelectedDate(new Date());
      }
      setEndDate("");
      setDescription("");
    }
    setErrors({});
  }, [event, defaultDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (title.trim().length < 3) {
      nextErrors.title = "Enter an event title with at least 3 characters.";
    }
    if (!eventDate) {
      nextErrors.eventDate = "Select a scheduled date.";
    } else if (eventDate < todayDate) {
      nextErrors.eventDate = "Scheduled date cannot be in the past.";
    }
    if (endDate && endDate < eventDate) {
      nextErrors.endDate = "End date cannot be earlier than the scheduled date.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateEventPayload = {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        end_date: endDate || null,
        event_type: "PRIVATE_EVENT",
        visibility: "PRIVATE",
        barangay_id: null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Failed to submit schedule event", err);
      setErrors({ form: "Unable to save the schedule. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = useMemo(() => {
    if (event) {
      const origDate = typeof event.event_date === "string" ? event.event_date.split("T")[0] : "";
      const origEndDate = event.end_date ? event.end_date.split("T")[0] : "";
      return (
        title !== event.title ||
        eventDate !== origDate ||
        endDate !== origEndDate ||
        description !== (event.description || "")
      );
    }
    return (
      title.trim() !== "" ||
      description.trim() !== "" ||
      endDate !== ""
    );
  }, [event, title, eventDate, endDate, description]);

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
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-[490px] p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        >
          <form noValidate onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            {/* Header (Pinned / Non-scrollable) */}
            <div className="px-5 py-4 border-b border-border/60 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                  {isEditing ? (
                    <CalendarCheck className="w-5 h-5" />
                  ) : (
                    <CalendarPlus className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight truncate">
                    {isEditing ? "Edit Schedule Event" : "Create Schedule / Event"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                    {isEditing
                      ? "Modify this internal MENRO schedule."
                      : "Register a task, meeting, or internal MENRO activity."}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* Form Fields (Scrollable Body) */}
          <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className={cn("text-xs font-semibold", errors.title ? "text-destructive" : "text-foreground")}>
                Event Title
              </Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((current) => ({ ...current, title: undefined, form: undefined }));
                }}
                placeholder="e.g. Monthly staff review"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "event-title-error" : undefined}
                className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs", errors.title ? "border-destructive/70 text-destructive focus-visible:ring-destructive/25" : "border-border/80 focus-visible:ring-primary/20")}
                maxLength={255}
              />
              {errors.title && <p id="event-title-error" className="text-[11px] font-medium text-destructive">{errors.title}</p>}
            </div>

            {/* Start and optional end date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start date dropdown */}
              <div className="space-y-1.5">
                <Label className={cn("text-xs font-semibold", errors.eventDate ? "text-destructive" : "text-foreground")}>
                  Date
                </Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-invalid={Boolean(errors.eventDate)}
                      aria-describedby={errors.eventDate ? "event-date-error" : undefined}
                      className={cn("flex h-9 w-full items-center justify-between rounded-xl border bg-background px-3 text-xs shadow-2xs hover:bg-muted/40 focus:outline-none focus:ring-2 transition-all cursor-pointer", errors.eventDate ? "border-destructive/70 text-destructive focus:ring-destructive/25" : "border-border/80 focus:ring-primary/20")}
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
                          const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                           setEventDate(formatted);
                           setErrors((current) => ({ ...current, eventDate: undefined, form: undefined }));
                          if (endDate && endDate < formatted) {
                            setEndDate("");
                          }
                          setIsDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
                {errors.eventDate && <p id="event-date-error" className="text-[11px] font-medium text-destructive">{errors.eventDate}</p>}
              </div>

              {/* Optional end date */}
              <div className="space-y-1.5">
                <Label className={cn("text-xs font-semibold", errors.endDate ? "text-destructive" : "text-foreground")}>
                  End Date <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-invalid={Boolean(errors.endDate)}
                      aria-describedby={errors.endDate ? "event-end-date-error" : undefined}
                      className={cn("flex h-9 w-full items-center justify-between rounded-xl border bg-background px-3 text-xs shadow-2xs hover:bg-muted/40 focus:outline-none focus:ring-2 transition-all cursor-pointer", errors.endDate ? "border-destructive/70 text-destructive focus:ring-destructive/25" : "border-border/80 focus:ring-primary/20")}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <CalendarDays className={cn("w-3.5 h-3.5 shrink-0", selectedEndDate ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("font-medium", selectedEndDate ? "text-foreground" : "text-muted-foreground")}>
                          {selectedEndDate ? format(selectedEndDate, "MMM d, yyyy") : "Select end date"}
                        </span>
                      </span>
                      {selectedEndDate ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEndDate("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              setEndDate("");
                            }
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                          title="Clear end date"
                        >
                          <X className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedEndDate}
                      onSelect={(d) => {
                        if (d) {
                           setEndDate(
                             `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                           );
                           setErrors((current) => ({ ...current, endDate: undefined, form: undefined }));
                          setIsEndDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3"
                    />
                    {selectedEndDate && (
                      <div className="p-2 border-t border-border/60 bg-muted/20 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEndDate("");
                            setIsEndDatePickerOpen(false);
                          }}
                          className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          Clear end date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {errors.endDate && <p id="event-end-date-error" className="text-[11px] font-medium text-destructive">{errors.endDate}</p>}
              </div>
            </div>

            {/* Description & Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Description & Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specific instructions, agenda items, or reminders..."
                rows={3}
                className="text-xs rounded-xl resize-none bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20 min-h-[72px] leading-relaxed"
              />
            </div>
            {errors.form && <p className="text-[11px] font-medium text-destructive">{errors.form}</p>}

          </div>

          {/* Footer (Pinned / Sticky) */}
          <div className="px-5 py-3.5 border-t border-border/60 shrink-0 bg-muted/20 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer border-border/80 hover:bg-muted/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
