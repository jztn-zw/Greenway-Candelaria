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
import { cn } from "@/lib/utils";
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
  }) => Promise<void>;
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
  const [errors, setErrors] = useState<Partial<Record<"name" | "model" | "plate" | "form", string>>>({});

  const clearError = (field: keyof typeof errors) => setErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });

  const isEditing = !!editingTruck;

  const resetForm = () => {
    setFormName("");
    setFormModel("");
    setFormPlate("");
    setFormStatus("Active");
    setErrors({});
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
    const nextErrors: typeof errors = {};
    if (!formName.trim()) nextErrors.name = "Enter a truck identifier.";
    if (!formModel.trim()) nextErrors.model = "Enter the vehicle model.";
    if (!formPlate.trim()) nextErrors.plate = "Enter the plate number.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    try {
      await onSave({ name: formName.trim(), model: formModel.trim(), plateNumber: formPlate.trim(), assignedDriverId: null, wasteType: "Biodegradable", status: formStatus });
      handleOpenChange(false);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Unable to save this truck. Please try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-md p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold font-display text-foreground tracking-tight truncate">
                {isEditing ? "Edit Truck Record" : "Add New Truck"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {isEditing
                  ? "Update vehicle specifications and availability status."
                  : "Register a new municipal waste collection vehicle."}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Balanced 2-Column Grid */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
          {/* Row 1: Name & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
               <Label htmlFor="truck-name" className={cn("text-xs font-semibold", errors.name ? "text-destructive" : "text-foreground")}>
                Truck Identifier
              </Label>
              <Input
                id="truck-name"
                value={formName}
                 onChange={(e) => { setFormName(e.target.value); clearError("name"); }}
                placeholder="e.g. Truck 1"
                 aria-invalid={Boolean(errors.name)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.name ? "border-destructive" : "border-border/80")}
               />
               {errors.name && <p className="text-[11px] font-medium text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="truck-model" className={cn("text-xs font-semibold", errors.model ? "text-destructive" : "text-foreground")}>
                Vehicle Model
              </Label>
              <Input
                id="truck-model"
                value={formModel}
                 onChange={(e) => { setFormModel(e.target.value); clearError("model"); }}
                placeholder="e.g. Isuzu Forward 6-Wheeler"
                 aria-invalid={Boolean(errors.model)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.model ? "border-destructive" : "border-border/80")}
               />
               {errors.model && <p className="text-[11px] font-medium text-destructive">{errors.model}</p>}
            </div>
          </div>

          {/* Row 2: Plate Number & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
               <Label htmlFor="truck-plate" className={cn("text-xs font-semibold", errors.plate ? "text-destructive" : "text-foreground")}>
                Plate Number
              </Label>
              <Input
                id="truck-plate"
                value={formPlate}
                 onChange={(e) => { setFormPlate(e.target.value); clearError("plate"); }}
                placeholder="e.g. ABC-1234"
                 aria-invalid={Boolean(errors.plate)} className={cn("h-9 text-xs rounded-xl font-sans tabular-nums font-semibold bg-background shadow-2xs px-3", errors.plate ? "border-destructive" : "border-border/80")}
               />
               {errors.plate && <p className="text-[11px] font-medium text-destructive">{errors.plate}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Operational Status</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as TruckOperationalStatus)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-md">
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
        <div className="px-5 py-3.5 border-t border-border/60 shrink-0 bg-muted/20 flex items-center justify-end gap-2.5">
          {errors.form && <p role="alert" className="mr-auto max-w-[55%] text-[11px] font-medium text-destructive">{errors.form}</p>}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
            className="h-9 px-4 rounded-xl text-xs font-semibold border-border/80 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
            className="h-9 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-sm gap-1.5"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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
