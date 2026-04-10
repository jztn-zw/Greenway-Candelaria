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
import type { Driver, Truck } from "../types";

interface DriverEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDriver: Driver | null;
  trucks: Truck[];
  drivers: Driver[];
  onSave: (data: {
    fullName: string;
    email?: string;
    username?: string;
    password?: string;
    contactNumber: string;
    licenseNumber: string;
    truckId: string | null;
  }) =>
    | { username?: string; password?: string }
    | null
    | void
    | Promise<{ username?: string; password?: string } | void | null>;
}

const DriverEditorModal = ({ open, onOpenChange, editingDriver, trucks, drivers, onSave }: DriverEditorModalProps) => {
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formTruckId, setFormTruckId] = useState<string>("none");

  const isEditing = !!editingDriver;

  const assignedTruckIds = drivers
    .filter(d => d.status === "Active" && d.id !== editingDriver?.id && d.truckId)
    .map(d => d.truckId);
  const availableTrucks = trucks.filter((t) => {
    if (t.id === editingDriver?.truckId) return true;
    return t.status === "Active" && !assignedTruckIds.includes(t.id);
  });

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormUsername("");
    setFormPassword("");
    setFormContact("");
    setFormTruckId("none");
  };

  useEffect(() => {
    if (!open) return;

    if (editingDriver) {
      setFormName(editingDriver.fullName);
      setFormEmail(editingDriver.email);
      setFormUsername(editingDriver.username);
      setFormPassword("");
      setFormContact(editingDriver.contactNumber);
      setFormTruckId(editingDriver.truckId || "none");
      return;
    }

    resetForm();
  }, [open, editingDriver]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContact.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!isEditing && !formEmail.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!isEditing && formUsername.trim().length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }
    if (!isEditing && formPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    const result = await onSave({
      fullName: formName.trim(),
      email: formEmail.trim() || undefined,
      username: formUsername.trim() || undefined,
      password: formPassword,
      contactNumber: formContact.trim(),
      licenseNumber: "",
      truckId: formTruckId === "none" ? null : formTruckId,
    });
    if (result !== null) {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Collector" : "Add New Collector"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the collector's information below." : "Fill in the details to register a new collector account."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="driver-name">Full Name</Label>
            <Input id="driver-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Roberto Navarro" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="driver-contact">Contact Number</Label>
            <Input id="driver-contact" value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="+63 917 123 4567" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="driver-email">Email</Label>
            <Input
              id="driver-email"
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="driver@email.com"
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">Email can only be set when creating a driver.</p>
            )}
          </div>
          {!isEditing && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="driver-username">Username</Label>
                <Input
                  id="driver-username"
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  placeholder="e.g. r.navarro"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="driver-password">Password</Label>
                <Input
                  id="driver-password"
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
            </>
          )}
          <div className="grid gap-1.5">
            <Label>Assigned Truck</Label>
            {availableTrucks.length === 0 && !isEditing ? (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                All active trucks are currently assigned. Unassign a truck from another driver first.
              </p>
            ) : (
              <Select value={formTruckId} onValueChange={setFormTruckId}>
                <SelectTrigger><SelectValue placeholder="Select a truck" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No truck assigned</SelectItem>
                  {availableTrucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.model} ({t.plateNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { void handleSave(); }}>{isEditing ? "Save Changes" : "Add Driver"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverEditorModal;
