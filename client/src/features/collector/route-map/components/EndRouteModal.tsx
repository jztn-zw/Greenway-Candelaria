import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

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
    <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
            End Route?
          </DialogTitle>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="py-3">
        <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {remaining > 0
            ? `You still have ${remaining} stop${remaining > 1 ? "s" : ""} remaining. Ending the route will mark every unfinished barangay as missed.`
            : "Are you sure you want to end the route?"}
        </DialogDescription>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-border/60">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer">
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Confirm End Route
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default EndRouteModal;
