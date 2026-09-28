import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminMutation } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { resetDriverPassword as apiresetDriverPassword } from "@/services/driverManagerService";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
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
    <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="w-[92vw] sm:max-w-md rounded-2xl border border-border/80 bg-background p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold font-display">
            <KeyRound className="h-5 w-5 text-primary" /> Reset Collector Password
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed">
            Set a new password for {driver.fullName}. Their current sessions will be signed out after you save it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="collector-new-password" className="text-xs font-semibold">New password</Label>
            <div className="relative">
              <Input
                id="collector-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(""); }}
                className="h-10 rounded-xl border-border/80 pr-10"
                aria-invalid={Boolean(error)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">At least 8 characters. Share it with the collector securely.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="collector-confirm-password" className="text-xs font-semibold">Confirm new password</Label>
            <Input
              id="collector-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => { setConfirmation(event.target.value); setError(""); }}
              className="h-10 rounded-xl border-border/80"
              aria-invalid={Boolean(error)}
              required
            />
          </div>

          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResetDriverPasswordDialog;
