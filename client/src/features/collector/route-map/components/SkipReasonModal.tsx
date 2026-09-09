import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { SkipReason } from "../types";
import { AlertTriangle, X } from "lucide-react";

const REASONS: SkipReason[] = [
  "Inaccessible Road",
  "No Residents Present",
  "Truck Issue",
  "Weather Condition",
  "Other",
];

interface SkipReasonModalProps {
  open: boolean;
  barangay: string;
  onConfirm: (reason: SkipReason, notes?: string) => void;
  onCancel: () => void;
}

const SkipReasonModal = ({
  open,
  barangay,
  onConfirm,
  onCancel,
}: SkipReasonModalProps) => {
  const [selected, setSelected] = useState<SkipReason | null>(null);
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected, selected === "Other" ? notes : undefined);
    setSelected(null);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-[92vw] sm:max-w-md rounded-2xl border border-border/80 p-0 shadow-2xl overflow-hidden bg-background [&>button:last-child]:hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-border/60">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground font-display">
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
              Skip Stop
            </DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Select why <span className="font-semibold text-foreground">{barangay}</span> cannot be collected. This will be logged and reported.
          </DialogDescription>

          <div className="grid gap-2">
            {REASONS.map((reason) => (
              <button
                type="button"
                key={reason}
                onClick={() => setSelected(reason)}
                className={`text-left px-3.5 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  selected === reason
                    ? "border-primary/50 bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                    : "border-border/70 bg-card text-foreground hover:bg-muted/60 hover:border-border"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {selected === "Other" && (
            <Textarea
              placeholder="Brief explanation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl border-border/80 text-xs resize-none"
              rows={2}
            />
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2 px-5 py-3.5 border-t border-border/60 bg-muted/20 sm:space-x-0">
          <Button variant="outline" onClick={onCancel} className="h-9 px-4 rounded-xl text-xs font-semibold hover:bg-muted">
            Cancel
          </Button>
          <Button
            disabled={!selected || (selected === "Other" && !notes.trim())}
            className="h-9 px-4 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            onClick={handleConfirm}
          >
            Confirm Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SkipReasonModal;
