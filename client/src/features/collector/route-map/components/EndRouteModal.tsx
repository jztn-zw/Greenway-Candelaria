import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { AlertTriangle } from "lucide-react";

interface EndRouteModalProps {
  open: boolean;
  remaining: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const EndRouteModal = ({ open, remaining, onConfirm, onCancel }: EndRouteModalProps) => (
  <ConfirmationDialog kind="dialog" open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}
    title="Conclude collection route?"
    description={remaining > 0
      ? `You still have ${remaining} checkpoint${remaining > 1 ? "s" : ""} remaining. Concluding now will mark unfinished barangays as missed.`
      : "All checkpoints are completed. Ready to conclude your collection shift?"}
    icon={<AlertTriangle />} variant="destructive" confirmLabel="Conclude route"
    onConfirm={onConfirm} onCancel={onCancel} />
);

export default EndRouteModal;
