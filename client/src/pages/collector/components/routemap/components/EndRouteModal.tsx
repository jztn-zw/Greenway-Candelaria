import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface EndRouteModalProps {
  open: boolean;
  remaining: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const EndRouteModal = ({
  open,
  remaining,
  onConfirm,
  onCancel,
}: EndRouteModalProps) => (
  <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-display">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          End Route?
        </DialogTitle>
        {/* ✅ FIX: Required by Radix UI for accessibility */}
        <DialogDescription>
          {remaining > 0
            ? `You still have ${remaining} stop${remaining > 1 ? "s" : ""} remaining. Are you sure you want to end this route?`
            : "Are you sure you want to end the route?"}
        </DialogDescription>
      </DialogHeader>

      {remaining > 0 && (
        <div className="px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20">
          <p className="text-sm font-semibold text-destructive">
            You have {remaining} stop{remaining > 1 ? "s" : ""} remaining.
          </p>
        </div>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Confirm End Route
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default EndRouteModal;
