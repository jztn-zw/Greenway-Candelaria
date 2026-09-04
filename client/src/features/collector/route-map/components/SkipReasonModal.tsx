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
import { AlertTriangle } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Skip Stop
          </DialogTitle>
          {/* ✅ FIX: Required by Radix UI for accessibility */}
          <DialogDescription>
            Select a reason for skipping{" "}
            <span className="font-semibold text-foreground">{barangay}</span>.
            This will be logged and reported.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                selected === reason
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted/50"
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
            className="mt-1"
            rows={2}
          />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!selected || (selected === "Other" && !notes.trim())}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
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
