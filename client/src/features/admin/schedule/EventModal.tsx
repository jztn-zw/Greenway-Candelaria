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
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  defaultDate: string;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
}

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
  }, [event, defaultDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Schedule title must be at least 3 characters. Please try again.");
      return;
    }
    if (!eventDate) {
      toast.error("Please select a valid scheduled date.");
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
      toast.error("Unable to save the schedule. Please try again.");
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
                      ? "Modify this internal MENRO schedule."
                      : "Register a task, meeting, or internal MENRO activity."}
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
                Event Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Monthly staff review"
                className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20"
                maxLength={255}
                required
              />
            </div>

            {/* Start and optional end date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Start date dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Date
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
                          const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                          setEventDate(formatted);
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
              </div>

              {/* Optional end date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  End Date <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-background px-3 text-xs shadow-2xs hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
                      disabled={(date) =>
                        selectedDate
                          ? date < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
                          : false
                      }
                      onSelect={(d) => {
                        if (d) {
                          setEndDate(
                            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                          );
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
              </div>
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
