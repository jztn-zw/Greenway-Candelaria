import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Truck, TruckOperationalStatus, Driver } from "../types";

interface TruckEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTruck: Truck | null;
  drivers: Driver[];
  trucks: Truck[];
  onSave: (data: {
    name: string;
    model: string;
    plateNumber: string;
    assignedDriverId: string | null;
    wasteType: string;
    status: TruckOperationalStatus;
  }) => void;
}

const TruckEditorModal = ({ open, onOpenChange, editingTruck, drivers, trucks, onSave }: TruckEditorModalProps) => {
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

  const handleSave = () => {
    if (!formName.trim() || !formModel.trim() || !formPlate.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    onSave({
      name: formName.trim(),
      model: formModel.trim(),
      plateNumber: formPlate.trim(),
      assignedDriverId: null,
      wasteType: "Biodegradable",
      status: formStatus,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Truck" : "Add New Truck"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the truck's information below." : "Fill in the details to register a new truck."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="truck-name">Truck Name</Label>
            <Input id="truck-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Truck 1" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="truck-model">Truck Model</Label>
            <Input id="truck-model" value={formModel} onChange={e => setFormModel(e.target.value)} placeholder="e.g. Isuzu Forward" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="truck-plate">Plate Number</Label>
            <Input id="truck-plate" value={formPlate} onChange={e => setFormPlate(e.target.value)} placeholder="e.g. ABC-1234" />
          </div>
          <div className="grid gap-1.5">
            <Label>Availability Status</Label>
            <Select value={formStatus} onValueChange={v => setFormStatus(v as TruckOperationalStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{isEditing ? "Save Changes" : "Add Truck"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TruckEditorModal;
