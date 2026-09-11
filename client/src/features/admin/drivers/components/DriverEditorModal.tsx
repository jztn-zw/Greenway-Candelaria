import { useEffect, useState, useMemo } from "react";
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
import { Loader2, X, UserPlus, UserCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import type { Driver, Truck } from "../types";

interface DriverEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDriver: Driver | null;
  trucks: Truck[];
  drivers: Driver[];
  isSaving?: boolean;
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

const DriverEditorModal = ({
  open,
  onOpenChange,
  editingDriver,
  trucks,
  drivers,
  isSaving = false,
  onSave,
}: DriverEditorModalProps) => {
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formTruckId, setFormTruckId] = useState<string>("none");

  const isEditing = !!editingDriver;

  const assignedTruckIds = drivers
    .filter((d) => d.status === "Active" && d.id !== editingDriver?.id && d.truckId)
    .map((d) => d.truckId);
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

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = useMemo(() => {
    if (editingDriver) {
      return (
        formName !== editingDriver.fullName ||
        formContact !== editingDriver.contactNumber ||
        formTruckId !== (editingDriver.truckId || "none") ||
        formPassword !== ""
      );
    }
    return (
      formName.trim() !== "" ||
      formContact.trim() !== "" ||
      formEmail.trim() !== "" ||
      formUsername.trim() !== "" ||
      formPassword !== "" ||
      formTruckId !== "none"
    );
  }, [editingDriver, formName, formContact, formEmail, formUsername, formPassword, formTruckId]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      handleOpenChange(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
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
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleRequestClose()}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="flex flex-col h-full max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header (Pinned / Non-scrollable) */}
            <div className="p-5 sm:p-6 pb-3.5 border-b border-border/60 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-muted/60 text-foreground border border-border/80 flex items-center justify-center shrink-0">
                  {isEditing ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                    {isEditing ? "Edit Collector Account" : "Add New Collector"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {isEditing
                      ? "Update collector profile and truck assignment."
                      : "Register a new municipal collector personnel."}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Row 1: Full Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-name" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <Input
                    id="driver-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Roberto Navarro"
                    className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="driver-contact" className="text-xs font-semibold">
                    Contact Number
                  </Label>
                  <Input
                    id="driver-contact"
                    value={formContact}
                    onChange={(e) =>
                      setFormContact(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="e.g. 09171234567"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="driver-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="driver-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="collector@greenway.ph"
                  disabled={isEditing}
                  className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs disabled:opacity-60"
                />
                {isEditing && (
                  <p className="text-[11px] text-muted-foreground">
                    Email address cannot be changed once registered.
                  </p>
                )}
              </div>

              {/* Row 3: Username & Temporary Password (Create Mode only) */}
              {!isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="driver-username" className="text-xs font-semibold">
                      Username
                    </Label>
                    <Input
                      id="driver-username"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. r.navarro"
                      className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="driver-password" className="text-xs font-semibold">
                      Temporary Password
                    </Label>
                    <Input
                      id="driver-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Row 4: Assigned Truck */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Truck</Label>
                {availableTrucks.length === 0 && !isEditing ? (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 border border-border/60">
                    All operational trucks are currently assigned.
                  </p>
                ) : (
                  <Select value={formTruckId} onValueChange={setFormTruckId}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs">
                      <SelectValue placeholder="Select a truck" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">No truck assigned</SelectItem>
                      {availableTrucks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — {t.model} ({t.plateNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Modal Footer (Pinned / Sticky) */}
            <div className="p-4 sm:p-5 sm:px-6 border-t border-border/60 shrink-0 bg-muted/10 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestClose}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>
                  {isSaving
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : "Create Collector Account"}
                </span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Universal Unsaved Changes Guard Dialog ── */}
      <UnsavedChangesDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onDiscard={() => {
          setShowDiscardConfirm(false);
          handleOpenChange(false);
        }}
        title={isEditing ? "Discard Changes?" : "Discard New Collector?"}
        description={
          isEditing
            ? "You have unsaved changes to this collector's profile. If you leave now, your edits will be lost."
            : "You have unsaved information entered for this new collector. If you leave now, the entered credentials will be discarded."
        }
        discardLabel={isEditing ? "Discard Changes" : "Discard"}
        keepEditingLabel="Keep Editing"
      />
    </>
  );
};

export default DriverEditorModal;
