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
import { cn } from "@/lib/utils";
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
    | Promise<{ username?: string; password?: string } | void>;
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
  const [errors, setErrors] = useState<Partial<Record<"name" | "contact" | "email" | "username" | "password" | "form", string>>>({});

  const clearError = (field: keyof typeof errors) => setErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });

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
    setErrors({});
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
    const nextErrors: typeof errors = {};
    if (!formName.trim()) nextErrors.name = "Enter the collector's full name.";
    if (!formContact.trim()) nextErrors.contact = "Enter a contact number.";
    if (!isEditing) {
      if (!formEmail.trim()) nextErrors.email = "Enter an email address.";
      else if (!/^\S+@\S+\.\S+$/.test(formEmail.trim())) nextErrors.email = "Enter a valid email address.";
      if (formUsername.trim().length < 3) nextErrors.username = "Username must be at least 3 characters.";
      if (formPassword.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    try {
      await onSave({
        fullName: formName.trim(), email: formEmail.trim() || undefined, username: formUsername.trim() || undefined,
        password: formPassword, contactNumber: formContact.trim(), licenseNumber: "", truckId: formTruckId === "none" ? null : formTruckId,
      });
      handleOpenChange(false);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Unable to save this collector. Please try again." });
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
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-lg p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden"
        >
          <form noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="flex flex-col h-full max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header (Pinned / Non-scrollable) */}
            <div className="px-5 py-4 border-b border-border/60 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                  {isEditing ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-semibold font-display text-foreground tracking-tight truncate">
                    {isEditing ? "Edit Collector Account" : "Add New Collector"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                    {isEditing
                      ? "Update collector profile and truck assignment."
                      : "Register a new municipal collector personnel."}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
              {/* Row 1: Full Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                   <Label htmlFor="driver-name" className={cn("text-xs font-semibold", errors.name ? "text-destructive" : "text-foreground")}>
                    Full Name
                  </Label>
                  <Input
                    id="driver-name"
                    value={formName}
                     onChange={(e) => { setFormName(e.target.value); clearError("name"); }}
                    placeholder="e.g. Roberto Navarro"
                     aria-invalid={Boolean(errors.name)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.name ? "border-destructive" : "border-border/80")}
                   />
                   {errors.name && <p className="text-[11px] font-medium text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                   <Label htmlFor="driver-contact" className={cn("text-xs font-semibold", errors.contact ? "text-destructive" : "text-foreground")}>
                    Contact Number
                  </Label>
                  <Input
                    id="driver-contact"
                    value={formContact}
                    onChange={(e) => {
                      setFormContact(e.target.value.replace(/\D/g, "").slice(0, 11));
                      clearError("contact");
                    }}
                    placeholder="e.g. 09171234567"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                     aria-invalid={Boolean(errors.contact)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.contact ? "border-destructive" : "border-border/80")}
                   />
                   {errors.contact && <p className="text-[11px] font-medium text-destructive">{errors.contact}</p>}
                </div>
              </div>

              {/* Row 2: Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="driver-email" className={cn("text-xs font-semibold", errors.email ? "text-destructive" : "text-foreground")}>
                  Email Address
                </Label>
                <Input
                  id="driver-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => { setFormEmail(e.target.value); clearError("email"); }}
                  placeholder="collector@greenway.ph"
                  disabled={isEditing}
                  aria-invalid={Boolean(errors.email)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3 disabled:opacity-60", errors.email ? "border-destructive" : "border-border/80")}
                />
                {errors.email && <p className="text-[11px] font-medium text-destructive">{errors.email}</p>}
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
                    <Label htmlFor="driver-username" className={cn("text-xs font-semibold", errors.username ? "text-destructive" : "text-foreground")}>
                      Username
                    </Label>
                    <Input
                      id="driver-username"
                      value={formUsername}
                      onChange={(e) => { setFormUsername(e.target.value); clearError("username"); }}
                      placeholder="e.g. r.navarro"
                      aria-invalid={Boolean(errors.username)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.username ? "border-destructive" : "border-border/80")}
                    />
                    {errors.username && <p className="text-[11px] font-medium text-destructive">{errors.username}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="driver-password" className={cn("text-xs font-semibold", errors.password ? "text-destructive" : "text-foreground")}>
                      Temporary Password
                    </Label>
                    <Input
                      id="driver-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => { setFormPassword(e.target.value); clearError("password"); }}
                      placeholder="At least 6 characters"
                      aria-invalid={Boolean(errors.password)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.password ? "border-destructive" : "border-border/80")}
                    />
                    {errors.password && <p className="text-[11px] font-medium text-destructive">{errors.password}</p>}
                  </div>
                </div>
              )}

              {/* Row 4: Assigned Truck */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Assigned Truck</Label>
                {availableTrucks.length === 0 && !isEditing ? (
                  <p className="text-xs text-muted-foreground bg-muted/20 rounded-xl px-3 py-2.5 border border-border/60">
                    All operational trucks are currently assigned.
                  </p>
                ) : (
                  <Select value={formTruckId} onValueChange={setFormTruckId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs px-3">
                      <SelectValue placeholder="Select a truck" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/80 shadow-md">
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
            <div className="px-5 py-3.5 border-t border-border/60 shrink-0 bg-muted/20 flex items-center justify-end gap-2.5">
              {errors.form && <p role="alert" className="mr-auto max-w-[55%] text-[11px] font-medium text-destructive">{errors.form}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestClose}
                disabled={isSaving}
                className="h-9 px-4 rounded-xl text-xs font-semibold border-border/80 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-sm gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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
