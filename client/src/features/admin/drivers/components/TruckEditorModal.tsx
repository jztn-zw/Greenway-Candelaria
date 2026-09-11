import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Loader2, X, Truck as TruckIcon } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Truck, TruckOperationalStatus, Driver } from "../types";

interface TruckEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTruck: Truck | null;
  drivers: Driver[];
  trucks: Truck[];
  isSaving?: boolean;
  onSave: (data: {
    name: string;
    model: string;
    plateNumber: string;
    assignedDriverId: string | null;
    wasteType: string;
    status: TruckOperationalStatus;
  }) => Promise<boolean> | boolean;
}

const TruckEditorModal = ({
  open,
  onOpenChange,
  editingTruck,
  drivers,
  trucks,
  isSaving = false,
  onSave,
}: TruckEditorModalProps) => {
  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formStatus, setFormStatus] = useState<TruckOperationalStatus>("Active");

  const isEditing = !!editingTruck;

  const resetForm = () => {
    setFormName("");
    setFormModel("");
    setFormPlate("");
    setFormStatus("Active");
  };

  useEffect(() => {
    if (!open) return;

    if (editingTruck) {
      setFormName(editingTruck.name);
      setFormModel(editingTruck.model);
      setFormPlate(editingTruck.plateNumber);
      setFormStatus(editingTruck.status);
      return;
    }

    resetForm();
  }, [open, editingTruck]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formName.trim() || !formModel.trim() || !formPlate.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const saved = await onSave({
      name: formName.trim(),
      model: formModel.trim(),
      plateNumber: formPlate.trim(),
      assignedDriverId: null,
      wasteType: "Biodegradable",
      status: formStatus,
    });
    if (saved) handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted/60 text-foreground border border-border/80 flex items-center justify-center shrink-0">
              <TruckIcon className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                {isEditing ? "Edit Truck Record" : "Add New Truck"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Update vehicle specifications and availability status."
                  : "Register a new municipal waste collection vehicle."}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Balanced 2-Column Grid */}
        <div className="space-y-3.5 py-2">
          {/* Row 1: Name & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="truck-name" className="text-xs font-semibold">
                Truck Identifier
              </Label>
              <Input
                id="truck-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Truck 1"
                className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="truck-model" className="text-xs font-semibold">
                Vehicle Model
              </Label>
              <Input
                id="truck-model"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="e.g. Isuzu Forward 6-Wheeler"
                className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs"
              />
            </div>
          </div>

          {/* Row 2: Plate Number & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="truck-plate" className="text-xs font-semibold">
                Plate Number
              </Label>
              <Input
                id="truck-plate"
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value)}
                placeholder="e.g. ABC-1234"
                className="h-10 text-xs rounded-xl font-sans tabular-nums font-semibold bg-background border-border/80 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Operational Status</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as TruckOperationalStatus)}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Active" className="text-xs">Active</SelectItem>
                  <SelectItem value="Under Maintenance" className="text-xs">
                    Under Maintenance
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
            className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
            className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Register Truck"}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TruckEditorModal;
