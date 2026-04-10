import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Announcement,
  EditorForm,
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementStatus,
  TargetAudience,
  BARANGAY_PRESETS,
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
  const timeInputClassName =
    "h-8 w-auto appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden";

  const getTimeFromDate = (dateStr: string) => {
    if (!dateStr) return "00:00";
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const setTimeForField = (field: "scheduledDate" | "expiryDate", time: string) => {
    setForm((prev) => {
      const current = prev[field] ? new Date(prev[field]) : new Date();
      const [h, m] = time.split(":").map(Number);
      current.setHours(h, m, 0, 0);
      return { ...prev, [field]: current.toISOString() };
    });
  };

  // CRITICAL FIX: Safety check
  if (!form) return null;

  const toggleBarangay = (id: string) => {
    setForm((prev) => ({
      ...prev,
      targetBarangays: prev.targetBarangays.includes(id)
        ? prev.targetBarangays.filter((x) => x !== id)
        : [...prev.targetBarangays, id],
    }));
  };

  const applyPreset = (presetName: string) => {
    const brgyNames = BARANGAY_PRESETS[presetName] || [];
    const brgyIds = (barangayOptions || [])
      .filter((b) => brgyNames.includes(b.name))
      .map((b) => b.id);
    setForm((prev) => ({
      ...prev,
      targetPreset: presetName,
      targetBarangays: brgyIds,
    }));
  };

  const filteredBarangays = (barangayOptions || []).filter((b) =>
    b.name.toLowerCase().includes(barangaySearch.toLowerCase()),
  );

  const saveLabel =
    form.status === "Draft"
      ? "Save as Draft"
      : form.status === "Active"
        ? "Send Now"
        : "Save";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details for the official notice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Notice title..."
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label>Body</Label>
              <span className="text-[10px] text-muted-foreground">
                {form.body.length}/{BODY_CHAR_LIMIT}
              </span>
            </div>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              className="min-h-[120px] resize-none"
              maxLength={BODY_CHAR_LIMIT}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as AnnouncementType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Schedule Change",
                    "Holiday Reminder",
                    "Emergency Advisory",
                    "General Notice",
                    "System Maintenance",
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    priority: v as AnnouncementPriority,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Normal", "Urgent", "Emergency"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Target Audience</Label>
            <Select
              value={form.targetAudience}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, targetAudience: v as TargetAudience }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Residents">All Residents</SelectItem>
                <SelectItem value="Specific Barangays">
                  Specific Barangays
                </SelectItem>
                <SelectItem value="Barangay Group Preset">
                  Barangay Group Preset
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.targetAudience === "Barangay Group Preset" && (
            <div className="space-y-1.5">
              <Label>Preset Group</Label>
              <Select
                value={form.targetPreset || ""}
                onValueChange={applyPreset}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(BARANGAY_PRESETS).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.targetAudience !== "All Residents" && (
            <div className="space-y-1.5">
              <Label>Barangays ({form.targetBarangays.length} selected)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    {form.targetBarangays.length > 0
                      ? `${form.targetBarangays.length} Selected`
                      : "Select Barangays..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search..."
                      value={barangaySearch}
                      onChange={(e) => setBarangaySearch(e.target.value)}
                    />
                  </div>
                  <div
                    className="max-h-[200px] overflow-y-auto overscroll-contain p-2"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onWheel={(e) => {
                      e.preventDefault();
                      e.currentTarget.scrollTop += e.deltaY;
                    }}
                  >
                    {filteredBarangays.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={form.targetBarangays.includes(b.id)}
                          onCheckedChange={() => toggleBarangay(b.id)}
                        />
                        <span className="text-sm">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, status: v as AnnouncementStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Draft", "Scheduled", "Active"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Featured (Pin)</Label>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))}
              />
            </div>
          </div>

          {/* Conditional date fields based on status */}
          {form.status === "Scheduled" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Scheduled Date & Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.scheduledDate
                        ? format(new Date(form.scheduledDate), "PPP p")
                        : "Pick scheduled date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.scheduledDate ? new Date(form.scheduledDate) : undefined}
                      onSelect={(date) =>
                        setForm((p) => ({
                          ...p,
                          scheduledDate: date ? date.toISOString() : "",
                        }))
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                    <div className="border-t px-3 py-2 flex items-center gap-2">
                      <Input
                        type="time"
                        value={getTimeFromDate(form.scheduledDate)}
                        onChange={(e) => setTimeForField("scheduledDate", e.target.value)}
                        className={timeInputClassName}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date & Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.expiryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.expiryDate
                        ? format(new Date(form.expiryDate), "PPP p")
                        : "Pick expiry date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.expiryDate ? new Date(form.expiryDate) : undefined}
                      onSelect={(date) =>
                        setForm((p) => ({
                          ...p,
                          expiryDate: date ? date.toISOString() : "",
                        }))
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                    <div className="border-t px-3 py-2 flex items-center gap-2">
                      <Input
                        type="time"
                        value={getTimeFromDate(form.expiryDate)}
                        onChange={(e) => setTimeForField("expiryDate", e.target.value)}
                        className={timeInputClassName}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {(form.status === "Draft" || form.status === "Active") && (
            <div className="space-y-1.5">
              <Label>Expiry Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.expiryDate
                      ? format(new Date(form.expiryDate), "PPP p")
                      : "Pick expiry date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.expiryDate ? new Date(form.expiryDate) : undefined}
                    onSelect={(date) =>
                      setForm((p) => ({
                        ...p,
                        expiryDate: date ? date.toISOString() : "",
                      }))
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  <div className="border-t px-3 py-2 flex items-center gap-2">
                    <Input
                      type="time"
                      value={getTimeFromDate(form.expiryDate)}
                      onChange={(e) => setTimeForField("expiryDate", e.target.value)}
                      className={timeInputClassName}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground">
                Announcement will auto-expire after this date.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || !form.title.trim() || !form.body.trim()}
          >
            {isSaving ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementEditor;
