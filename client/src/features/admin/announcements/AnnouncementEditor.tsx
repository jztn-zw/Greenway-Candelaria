import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  ChevronDown,
  Megaphone,
  Clock,
  Send,
  Loader2,
  Search,
  AlertTriangle,
  FileText,
  Trash2,
  X,
  CheckCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Announcement,
  EditorForm,
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementStatus,
  TargetAudience,
  BODY_CHAR_LIMIT,
} from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAnnouncement: Announcement | null;
  form: EditorForm;
  setForm: React.Dispatch<React.SetStateAction<EditorForm>>;
  onSave: () => void;
  isSaving: boolean;
  barangayOptions: { id: string; name: string }[];
}

const AnnouncementEditor = ({
  open,
  onOpenChange,
  editingAnnouncement,
  form,
  setForm,
  onSave,
  isSaving,
  barangayOptions,
}: Props) => {
  const [barangaySearch, setBarangaySearch] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Database DATETIME values are UTC but arrive without a timezone suffix.
  const parseStoredDate = (value: string) => {
    const normalized = /^\d{4}-\d{2}-\d{2}/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;
    return new Date(normalized);
  };

  const getTimeFromDate = (dateStr: string) => {
    if (!dateStr) return "00:00";
    const d = parseStoredDate(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  };

  const setTimeForField = (
    field: "scheduledDate" | "expiryDate",
    time: string,
  ) => {
    setForm((prev) => {
      const current = prev[field] ? parseStoredDate(prev[field]) : new Date();
      const [h, m] = time.split(":").map(Number);
      // An announcement expires exactly at the time selected by the admin.
      current.setHours(h, m, 0, 0);
      return { ...prev, [field]: current.toISOString() };
    });
  };

  const expiryAtEndOfDay = (date?: Date) => {
    if (!date) return "";
    const expiry = new Date(date);
    // When an admin chooses only a date, expire at the end of that local day.
    expiry.setHours(23, 59, 59, 0);
    return expiry.toISOString();
  };

  if (!form) return null;

  const isDirty = useMemo(() => {
    if (!form) return false;
    if (editingAnnouncement) {
      return (
        form.title !== editingAnnouncement.title ||
        form.body !== editingAnnouncement.body ||
        form.type !== editingAnnouncement.type ||
        form.priority !== editingAnnouncement.priority ||
        form.status !== editingAnnouncement.status ||
        form.targetAudience !== editingAnnouncement.targetAudience ||
        form.scheduledDate !== (editingAnnouncement.scheduledDate ?? "") ||
        form.expiryDate !== (editingAnnouncement.expiryDate ?? "")
      );
    }
    return (
      Boolean(form.title.trim()) ||
      Boolean(form.body.trim()) ||
      form.targetBarangays.length > 0
    );
  }, [form, editingAnnouncement]);

  const handleAttemptClose = () => {
    if (isDirty && !isSaving) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onOpenChange(false);
  };

  const handleSaveActionAndClose = () => {
    setShowDiscardConfirm(false);
    if (!editingAnnouncement) {
      setForm((prev) => ({ ...prev, status: "Draft" }));
    }
    setTimeout(() => {
      onSave();
    }, 50);
  };

  const promptTitle = editingAnnouncement
    ? "Discard Changes?"
    : "Unsaved Announcement";

  const promptDescription = editingAnnouncement
    ? "You have unsaved edits to this announcement. Do you want to discard your changes or save them?"
    : "You have unsaved changes in this announcement. What would you like to do?";

  const discardButtonLabel = editingAnnouncement
    ? "Discard Changes"
    : "Delete Draft";

  const saveButtonLabel = editingAnnouncement
    ? "Save Changes"
    : "Save as Draft";

  const toggleBarangay = (id: string) => {
    setForm((prev) => ({
      ...prev,
      targetBarangays: prev.targetBarangays.includes(id)
        ? prev.targetBarangays.filter((x) => x !== id)
        : [...prev.targetBarangays, id],
    }));
  };

  const isAllSelected = useMemo(() => {
    return (
      (barangayOptions || []).length > 0 &&
      barangayOptions.every((b) => form.targetBarangays.includes(b.id))
    );
  }, [barangayOptions, form.targetBarangays]);

  const selectAllBarangays = () => {
    setForm((prev) => ({
      ...prev,
      targetBarangays: (barangayOptions || []).map((b) => b.id),
    }));
  };

  const clearAllBarangays = () => {
    setForm((prev) => ({
      ...prev,
      targetBarangays: [],
    }));
  };

  const filteredBarangays = (barangayOptions || []).filter((b) =>
    b.name.toLowerCase().includes(barangaySearch.toLowerCase()),
  );

  const saveLabel =
    form.status === "Draft"
      ? "Save as Draft"
      : form.status === "Active"
        ? "Send Notice Now"
        : "Schedule Notice";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleAttemptClose();
          } else {
            onOpenChange(true);
          }
        }}
      >
        <DialogContent
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
          onPointerDownOutside={(e) => {
            if (isDirty && !isSaving) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty && !isSaving) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
        >
          {/* ── Fixed Pinned Header (Non-Scrollable) with Top-Right X ── */}
          <div className="p-4 sm:p-5 pb-3 border-b border-border/60 shrink-0 bg-background z-20 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-bold font-display text-foreground tracking-tight truncate">
                  {editingAnnouncement
                    ? "Edit Announcement"
                    : "Create Announcement"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Broadcast official notices and schedule updates to residents.
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Scrollable Form Body ── */}
          <div className="overflow-y-auto px-4 sm:px-5 py-4 space-y-4 flex-1 overscroll-contain">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/90">
                Notice Title
              </Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Special Holiday Waste Collection Schedule"
                className="h-10 rounded-xl bg-background border border-border text-xs px-3.5 focus-visible:ring-primary/20"
              />
            </div>

            {/* Message Body with Character Counter */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-foreground/90">
                  Message Content
                </Label>
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md tabular-nums border border-border/40">
                  {form.body.length} / {BODY_CHAR_LIMIT}
                </span>
              </div>
              <Textarea
                value={form.body}
                onChange={(e) =>
                  setForm((p) => ({ ...p, body: e.target.value }))
                }
                placeholder="Write the details of the announcement here..."
                className="min-h-[110px] rounded-xl bg-background border border-border p-3 text-xs resize-none focus-visible:ring-primary/20 leading-relaxed"
                maxLength={BODY_CHAR_LIMIT}
              />
            </div>

            {/* Type & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90">
                  Notice Type
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as AnnouncementType }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background border border-border text-xs px-3 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border">
                    {[
                      "Schedule Change",
                      "Holiday Reminder",
                      "Emergency Advisory",
                      "General Notice",
                      "System Maintenance",
                    ].map((t) => (
                      <SelectItem key={t} value={t} className="text-xs font-medium">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90">
                  Priority Level
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      priority: v as AnnouncementPriority,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background border border-border text-xs px-3 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border">
                    {["Normal", "Urgent", "Emergency"].map((p) => (
                      <SelectItem key={p} value={p} className="text-xs font-medium">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/90">
                Target Audience
              </Label>
              <Select
                value={form.targetAudience}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    targetAudience: v as TargetAudience,
                    targetBarangays: v === "All Residents" ? [] : p.targetBarangays,
                  }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl bg-background border border-border text-xs px-3 focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border">
                  <SelectItem value="All Residents" className="text-xs font-medium">
                    All Residents (Municipality-wide)
                  </SelectItem>
                  <SelectItem value="Specific Barangays" className="text-xs font-medium">
                    Specific Barangays
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Barangays Picker */}
            {form.targetAudience === "Specific Barangays" && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/70">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Label className="text-xs font-semibold text-foreground/90 shrink-0">
                      Target Barangays
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold h-5 px-2 rounded-full bg-primary/10 text-primary border-primary/25 shrink-0"
                    >
                      {form.targetBarangays.length} / {barangayOptions.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={selectAllBarangays}
                      className="text-xs font-semibold text-primary hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer bg-transparent border-0 p-0 outline-none"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground/40 text-xs select-none">•</span>
                    <button
                      type="button"
                      onClick={clearAllBarangays}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 outline-none"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-between font-normal rounded-xl bg-background border border-border text-xs px-3"
                    >
                      <span className="truncate">
                        {form.targetBarangays.length > 0
                          ? `${form.targetBarangays.length} Barangay${
                              form.targetBarangays.length !== 1 ? "s" : ""
                            } Selected`
                          : "Click to select target barangays..."}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[320px] p-0 rounded-xl border border-border shadow-xl z-[70]"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    <div className="p-2.5 border-b border-border">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search barangays..."
                          value={barangaySearch}
                          onChange={(e) => setBarangaySearch(e.target.value)}
                          className="h-8 pl-8 pr-7 text-xs rounded-lg bg-muted/30 border-border"
                        />
                        {barangaySearch && (
                          <button
                            type="button"
                            onClick={() => setBarangaySearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <ScrollArea
                      className="h-[220px] p-1.5"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-0.5 pr-2">
                        {filteredBarangays.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No barangays found.
                          </p>
                        ) : (
                          filteredBarangays.map((b) => {
                            const isChecked = form.targetBarangays.includes(b.id);
                            return (
                              <label
                                key={b.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium select-none ${
                                  isChecked
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleBarangay(b.id)}
                                  className="rounded-sm border-border"
                                />
                                <span>{b.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Selected barangays chips preview */}
                {form.targetBarangays.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {isAllSelected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-semibold">
                        <CheckCheck className="w-3.5 h-3.5" />
                        All {barangayOptions.length} Barangays Selected
                      </span>
                    ) : (
                      <>
                        {form.targetBarangays.slice(0, 4).map((id) => {
                          const bName =
                            barangayOptions.find((b) => b.id === id)?.name || id;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-background border border-border/80 text-xs text-foreground font-medium shadow-2xs"
                            >
                              <span className="truncate max-w-[120px]">{bName}</span>
                              <button
                                type="button"
                                onClick={() => toggleBarangay(id)}
                                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer ml-0.5"
                                title={`Remove ${bName}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                        {form.targetBarangays.length > 4 && (
                          <span className="text-[11px] font-medium text-muted-foreground px-1 self-center">
                            +{form.targetBarangays.length - 4} more
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Publishing Status */}
            <div className="pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90 h-5 flex items-center">
                  Publishing Status
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as AnnouncementStatus }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background border border-border text-xs px-3 focus:ring-primary/20 shadow-2xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border">
                    <SelectItem value="Active" className="text-xs font-medium">
                      Active
                    </SelectItem>
                    <SelectItem value="Scheduled" className="text-xs font-medium">
                      Scheduled
                    </SelectItem>
                    <SelectItem value="Draft" className="text-xs font-medium">
                      Draft
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.status === "Scheduled" && (
              <div className="space-y-3 p-3 rounded-xl bg-muted/40 border border-border/70">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Broadcast Date & Time
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal rounded-xl bg-background border border-border text-xs px-3",
                          !form.scheduledDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {form.scheduledDate
                          ? format(parseStoredDate(form.scheduledDate), "PPP p")
                          : "Pick broadcast date..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 rounded-xl border border-border shadow-xl"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={
                          form.scheduledDate
                            ? parseStoredDate(form.scheduledDate)
                            : undefined
                        }
                        onSelect={(date) =>
                          setForm((p) => ({
                            ...p,
                            scheduledDate: date ? date.toISOString() : "",
                          }))
                        }
                        initialFocus
                        className="p-3"
                      />
                      <div className="relative border-t border-border p-2.5 flex items-center justify-between gap-2 bg-muted/20">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          Time:
                        </span>
                        <TimePicker
                          value={getTimeFromDate(form.scheduledDate)}
                          onChange={(val) =>
                            setTimeForField("scheduledDate", val)
                          }
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    Auto-Expiry (Optional)
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal rounded-xl bg-background border border-border text-xs px-3",
                          !form.expiryDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {form.expiryDate
                          ? format(parseStoredDate(form.expiryDate), "PPP p")
                          : "Never expires"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 rounded-xl border border-border shadow-xl"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={
                          form.expiryDate
                            ? parseStoredDate(form.expiryDate)
                            : undefined
                        }
                        onSelect={(date) =>
                          setForm((p) => ({
                            ...p,
                            expiryDate: expiryAtEndOfDay(date),
                          }))
                        }
                        initialFocus
                        className="p-3"
                      />
                      <div className="relative border-t border-border p-2.5 flex items-center justify-between gap-2 bg-muted/20">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                          Time:
                        </span>
                        <TimePicker
                          value={getTimeFromDate(form.expiryDate)}
                          onChange={(val) =>
                            setTimeForField("expiryDate", val)
                          }
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Optional Expiry for Draft and Active */}
            {form.status !== "Scheduled" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Auto-Expiry Date (Optional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal rounded-xl bg-background border border-border text-xs px-3",
                        !form.expiryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {form.expiryDate
                        ? format(parseStoredDate(form.expiryDate), "PPP p")
                        : "Never expires (stays visible until manually archived)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 rounded-xl border border-border shadow-xl"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={
                        form.expiryDate
                          ? parseStoredDate(form.expiryDate)
                          : undefined
                      }
                      onSelect={(date) =>
                        setForm((p) => ({
                          ...p,
                          expiryDate: expiryAtEndOfDay(date),
                        }))
                      }
                      initialFocus
                      className="p-3"
                    />
                    <div className="relative border-t border-border p-2.5 flex items-center justify-between gap-2 bg-muted/20">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        Time:
                      </span>
                      <TimePicker
                        value={getTimeFromDate(form.expiryDate)}
                        onChange={(val) =>
                          setTimeForField("expiryDate", val)
                        }
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* ── Fixed Pinned Footer (Non-Scrollable) ── */}
          <DialogFooter className="px-4 sm:px-5 py-3.5 border-t border-border/80 shrink-0 bg-background z-10 flex flex-row items-center justify-end">
            <Button
              type="button"
              onClick={onSave}
              disabled={
                isSaving ||
                !form.title.trim() ||
                !form.body.trim() ||
                (form.status === "Scheduled" && !form.scheduledDate) ||
                (form.targetAudience !== "All Residents" && form.targetBarangays.length === 0)
              }
              className="h-10 px-6 rounded-xl font-semibold text-xs gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{saveLabel}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Universal Unsaved Changes Guard Dialog ── */}
      <UnsavedChangesDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onDiscard={handleConfirmDiscard}
        onSave={handleSaveActionAndClose}
        title={promptTitle}
        description={promptDescription}
        discardLabel={discardButtonLabel}
        saveLabel={saveButtonLabel}
        keepEditingLabel="Keep Editing"
      />
    </>
  );
};

export default AnnouncementEditor;
