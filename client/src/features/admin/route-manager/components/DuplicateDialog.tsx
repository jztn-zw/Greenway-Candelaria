import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, X, Leaf, Trash2 } from "lucide-react";
import { DAYS, WASTE_MAP } from "../constants";
import type { Day } from "../hooks/useRoutes";

interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDay: Day;
  sourceDay: Day | null;
  setTargetDay: (day: Day) => void;
  isSaving: boolean;
  onDuplicate: () => void;
}

export const DuplicateDialog: React.FC<DuplicateDialogProps> = ({
  open,
  onOpenChange,
  targetDay,
  sourceDay,
  setTargetDay,
  isSaving,
  onDuplicate,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
              Duplicate Collection Route
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Copy this route sequence to another operating day.
            </DialogDescription>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-3.5 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Choose a target day. The route will be cloned with the same vehicle, driver, start time, and ordered barangay sequence.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Target Day of Week
          </label>
          <Select value={targetDay} onValueChange={(v) => setTargetDay(v as Day)}>
            <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {DAYS.filter((day) => day !== sourceDay).map((d) => {
                const waste = WASTE_MAP[d];
                const isBio = waste.type === "biodegradable";
                return (
                  <SelectItem key={d} value={d} className="text-xs">
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-semibold">{d}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {isBio ? (
                          <Leaf className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Trash2 className="w-3 h-3 text-amber-500" />
                        )}
                        {waste.label}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
          className="h-9 text-xs rounded-xl border-border/80 px-4 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onDuplicate}
          disabled={isSaving}
          className="h-9 text-xs rounded-xl font-bold px-5 shadow-sm gap-1.5 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Duplicating...</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
          <span>Duplicate Route</span>
            </>
          )}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default DuplicateDialog;
