import { toast } from "@/lib/toast";
import { getActionErrorMessage } from "@/lib/feedbackMessages";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminModalContent as DialogContent } from "@/components/admin/AdminModal";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X, UserPlus, UserCheck, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminUnsavedChangesDialog as UnsavedChangesDialog } from "@/components/admin/AdminModal";
import type { Driver, Truck } from "../types";
import { adminCollectorManagerStyles as styles } from "@/components/common/communityContentStyles";

interface DriverEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDriver: Driver | null;
  trucks: Truck[];
  drivers: Driver[];
  isSaving?: boolean;
  onSave: (data: {
    fullName: string;
    username?: string;
    password?: string;
    contactNumber: string;
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
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formContact, setFormContact] = useState("");
  const [formTruckId, setFormTruckId] = useState<string>("none");
  const [errors, setErrors] = useState<Partial<Record<"name" | "contact" | "username" | "password" | "form", string>>>({});

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
    setFormUsername("");
    setFormPassword("");
    setShowPassword(false);
    setFormContact("");
    setFormTruckId("none");
    setErrors({});
  };

  useEffect(() => {
    if (!open) return;

    if (editingDriver) {
      setFormName(editingDriver.fullName);
      setFormUsername(editingDriver.username);
      setFormPassword("");
      setShowPassword(false);
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
        formUsername !== editingDriver.username ||
        formContact !== editingDriver.contactNumber ||
        formTruckId !== (editingDriver.truckId || "none") ||
        formPassword !== ""
      );
    }
    return (
      formName.trim() !== "" ||
      formContact.trim() !== "" ||
      formUsername.trim() !== "" ||
      formPassword !== "" ||
      formTruckId !== "none"
    );
  }, [editingDriver, formName, formContact, formUsername, formPassword, formTruckId]);

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
    else if (!/^09\d{9}$/.test(formContact)) nextErrors.contact = "Enter an 11-digit Philippine mobile number starting with 09.";
    if (!isEditing) {
      if (formUsername.trim().length < 3) nextErrors.username = "Username must be at least 3 characters.";
      if (formPassword.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    }
    if (isEditing && !/^[^\s@]{3,50}$/.test(formUsername.trim())) nextErrors.username = "Use 3–50 characters without spaces or @.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    try {
      await onSave({
        fullName: formName.trim(), username: formUsername.trim() || undefined,
        password: formPassword, contactNumber: formContact.trim(), truckId: formTruckId === "none" ? null : formTruckId,
      });
      handleOpenChange(false);
    } catch (error) {
      toast.error("Could not save collector", { description: getActionErrorMessage(error) });
      const response = (error as { response?: { data?: { message?: string } } }).response?.data;
      const message = response?.message || (error instanceof Error ? error.message : "Unable to save this collector. Please try again.");
      setErrors(message === "Username already taken" ? { username: "Username already taken. Choose another username." } : { form: message });
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
          className={cn(styles.modal, "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-lg p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90dvh] flex flex-col overflow-hidden")}
        >
          <form noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="flex min-h-0 flex-col max-h-[90dvh] overflow-hidden"
          >
            {/* Modal Header (Pinned / Non-scrollable) */}
            <div className="gw-modal-header px-5 py-4 border-b border-border/60 shrink-0 flex items-center justify-between gap-3 bg-card">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                  {isEditing ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="gw-heading text-base text-foreground tracking-tight break-words">
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
                className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="gw-modal-body collector-manager-modal-body min-h-0 px-5 py-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
              {/* Account identifier and contact */}
              <div className="collector-manager-modal-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isEditing ? <div className="space-y-1.5">
                  <Label htmlFor="driver-username" className="text-xs font-medium text-foreground">Username</Label>
                  <Input id="driver-username" value={formUsername} maxLength={50} autoComplete="off" spellCheck={false}
                    onChange={(event) => { setFormUsername(event.target.value); clearError("username"); }}
                    placeholder="Enter the collector's username" aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "driver-username-error" : undefined}
                    className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.username ? "border-destructive" : "border-border/80")} />
                  {errors.username && <p id="driver-username-error" role="alert" className="text-ui-caption font-medium text-destructive">{errors.username}</p>}
                </div> : <div className="space-y-1.5">
                   <Label htmlFor="driver-name" className="text-xs font-medium text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="driver-name"
                    value={formName}
                     onChange={(e) => { setFormName(e.target.value); clearError("name"); }}
                    placeholder="e.g. Roberto Navarro"
                     aria-invalid={Boolean(errors.name)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.name ? "border-destructive" : "border-border/80")}
                   />
                   {errors.name && <p className="text-ui-caption font-medium text-destructive">{errors.name}</p>}
                </div>}

                <div className="space-y-1.5">
                   <Label htmlFor="driver-contact" className="text-xs font-medium text-foreground">
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
                   {errors.contact && <p className="text-ui-caption font-medium text-destructive">{errors.contact}</p>}
                </div>
              </div>

              {/* Row 3: Username & Password (Create Mode only) */}
              {!isEditing && (
                <div className="collector-manager-modal-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="driver-username" className="text-xs font-medium text-foreground">
                      Username
                    </Label>
                    <Input
                      id="driver-username"
                      value={formUsername}
                      onChange={(e) => { setFormUsername(e.target.value); clearError("username"); }}
                      placeholder="e.g. r.navarro"
                      aria-invalid={Boolean(errors.username)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.username ? "border-destructive" : "border-border/80")}
                    />
                    {errors.username && <p className="text-ui-caption font-medium text-destructive">{errors.username}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="driver-password" className="text-xs font-medium text-foreground">
                      Initial Password
                    </Label>
                    <div className="relative">
                    <Input
                      id="driver-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={formPassword}
                      onChange={(e) => { setFormPassword(e.target.value); clearError("password"); }}
                      placeholder="At least 6 characters"
                      aria-invalid={Boolean(errors.password)} className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs pl-3 pr-11", errors.password ? "border-destructive" : "border-border/80")}
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2"
                      aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}
                      disabled={isSaving} onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    </div>
                    {errors.password && <p className="text-ui-caption font-medium text-destructive">{errors.password}</p>}
                  </div>
                </div>
              )}

              {/* Row 4: Assigned Truck */}
              {isEditing && <div className="space-y-1.5">
                <Label htmlFor="driver-name" className="text-xs font-medium text-foreground">Full Name</Label>
                <Input id="driver-name" value={formName}
                  onChange={(event) => { setFormName(event.target.value); clearError("name"); }}
                  placeholder="e.g. Roberto Navarro" aria-invalid={Boolean(errors.name)}
                  className={cn("h-9 text-xs rounded-xl bg-background shadow-2xs px-3", errors.name ? "border-destructive" : "border-border/80")} />
                {errors.name && <p className="text-ui-caption font-medium text-destructive">{errors.name}</p>}
              </div>}
              {isEditing && <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Assigned Truck</Label>
                  <SearchableSelect value={formTruckId} onValueChange={setFormTruckId}
                    options={[{ value: "none", label: "No Truck Assigned" }, ...availableTrucks.map((t) => ({ value: t.id, label: `${t.name} — ${t.model} (${t.plateNumber})` }))]}
                    placeholder="Select a truck" aria-label="Assigned Truck" searchPlaceholder="Search by truck name or plate…" compactSearchPlaceholder="Truck name or plate…" fieldSize="compact"
                    className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs px-3" />
              </div>}
            </div>

            {/* Modal Footer (Pinned / Sticky) */}
            <div className="gw-modal-footer px-5 py-3.5 border-t border-border/60 shrink-0 flex flex-wrap items-center justify-end gap-2.5 bg-card">
              {errors.form && <p role="alert" className="w-full break-words text-ui-caption font-medium text-destructive">{errors.form}</p>}
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestClose}
                disabled={isSaving}
                className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 px-5 rounded-xl font-semibold text-xs cursor-pointer shadow-sm gap-1.5"
                loading={isSaving}
                loadingLabel={isEditing ? "Saving collector…" : "Creating account…"}
              >

                <span>
                  {isEditing
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
