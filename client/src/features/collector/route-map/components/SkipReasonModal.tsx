import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import type { SkipReason } from "../types";
import { AlertTriangle } from "lucide-react";
import { CollectorModalHeader } from "../../components/CollectorModal";
import { collectorModalStyles as styles } from "../../components/collectorModalStyles";

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
  const [showDiscard, setShowDiscard] = useState(false);

  useEffect(() => {
    if (!open) { setSelected(null); setNotes(""); setShowDiscard(false); }
  }, [open]);

  const requestClose = () => {
    if (selected || notes) setShowDiscard(true);
    else onCancel();
  };

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected, selected === "Other" ? notes : undefined);
    setSelected(null);
    setNotes("");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className={styles.content}>
        <CollectorModalHeader title="Skip checkpoint" description="Choose a skip reason" icon={<AlertTriangle />} onClose={requestClose} />

        <div className={styles.body}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Select why <span className="font-semibold text-foreground">{barangay}</span> cannot be collected. This will be logged and reported.
          </p>
          <div className="grid gap-2">
            {REASONS.map((reason) => (
              <button
                type="button"
                key={reason}
                onClick={() => setSelected(reason)}
                aria-pressed={selected === reason}
                className={`text-left px-3 py-2.5 rounded-md border text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected === reason
                    ? "border-primary/50 bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                    : "border-border/70 bg-card text-foreground hover:bg-[var(--button-neutral-hover)] hover:border-border"
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
              className={styles.textarea}
              rows={2}
            />
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="outline" onClick={requestClose} className={styles.cancelButton}>
            Cancel
          </Button>
          <Button
            disabled={!selected || (selected === "Other" && !notes.trim())}
            className={styles.primaryButton}
            onClick={handleConfirm}
          >
            Confirm skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog isOpen={open && showDiscard} onClose={() => setShowDiscard(false)}
      onDiscard={() => { setShowDiscard(false); setSelected(null); setNotes(""); onCancel(); }}
      title="Discard Skip Reason?" description="Your selected reason and notes will be lost."
      discardLabel="Discard Changes" />
    </>
  );
};

export default SkipReasonModal;
