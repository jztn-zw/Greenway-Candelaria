import { Button } from "@/components/ui/button";
import { AdminModal } from "@/components/admin/AdminModal";
import { formDialogStyles } from "@/components/dialogs/formDialogStyles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminMutation } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { resetDriverPassword as apiresetDriverPassword } from "@/services/driverManagerService";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Driver } from "../types";

interface Props {
  driver: Driver;
  onClose: () => void;
}

const ResetDriverPasswordDialog = ({ driver, onClose }: Props) => {
  const resetDriverPassword = useAdminMutation(apiresetDriverPassword, "drivers");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    if (password.length < 8 || password.trim().length === 0) {
      setError("Enter a password of at least 8 characters.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must be at most 72 bytes.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await resetDriverPassword(driver.id, password);
      toast.success(`Password updated for ${driver.fullName}`);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reset the password.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModal open onOpenChange={(open) => { if (!open) onClose(); }} pending={isSaving}
      title="Reset Collector Password" icon={<KeyRound />} closeLabel="Close password reset"
      description={<>Set a new password for {driver.fullName}. Their current sessions will be signed out after you save it.</>}
      footer={<>
        <Button type="button" variant="outline" disabled={isSaving} onClick={onClose} className={formDialogStyles.cancelButton}>Cancel</Button>
        <Button type="submit" form="collector-reset-password-form" disabled={isSaving} className={formDialogStyles.primaryButton} loading={isSaving} loadingLabel="Saving password…">Save Password</Button>
      </>}
    >
        <form id="collector-reset-password-form" onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="collector-new-password" className="text-xs font-medium">New Password</Label>
            <div className="relative">
              <Input
                id="collector-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(""); }}
                className="h-9 rounded-lg border-border/80 bg-background pr-10 text-ui-label"
                aria-invalid={Boolean(error)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="gw-action-ghost absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-ui-caption text-muted-foreground">At least 8 characters. Share it with the collector securely.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="collector-confirm-password" className="text-xs font-medium">Confirm New Password</Label>
            <Input
              id="collector-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => { setConfirmation(event.target.value); setError(""); }}
              className="h-9 rounded-lg border-border/80 bg-background text-ui-label"
              aria-invalid={Boolean(error)}
              required
            />
          </div>

          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

        </form>
    </AdminModal>
  );
};

export default ResetDriverPasswordDialog;
