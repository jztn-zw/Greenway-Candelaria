import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Leaf, Trash2 } from "lucide-react";
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
  <ConfirmationDialog
    kind="dialog"
    open={open}
    onOpenChange={onOpenChange}
    title="Duplicate Collection Route"
    description="Copy this route sequence to another operating day."
    icon={<Copy />}
    confirmLabel="Duplicate Route"
    isPending={isSaving}
    pendingLabel="Duplicating..."
    onConfirm={onDuplicate}
  >
    <div className="space-y-3.5">
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
  </ConfirmationDialog>
);

export default DuplicateDialog;
