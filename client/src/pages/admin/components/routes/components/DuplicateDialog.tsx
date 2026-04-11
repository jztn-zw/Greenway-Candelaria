import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2 } from "lucide-react";
import { DAYS, WASTE_MAP } from "../constants";
import type { Day } from "../hooks/useRoutes";

interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDay: Day;
  setTargetDay: (day: Day) => void;
  isSaving: boolean;
  onDuplicate: () => void;
}

const DuplicateDialog = ({
  open,
  onOpenChange,
  targetDay,
  setTargetDay,
  isSaving,
  onDuplicate,
}: DuplicateDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-base">Duplicate Route</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <p className="text-sm text-muted-foreground">
          Choose a target day. The route will be copied with the same truck, driver, and barangay order.
        </p>
        <Select value={targetDay} onValueChange={(v) => setTargetDay(v as Day)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>{d} — {WASTE_MAP[d].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
        <Button onClick={onDuplicate} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          {isSaving ? "Duplicating..." : "Duplicate"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DuplicateDialog;
