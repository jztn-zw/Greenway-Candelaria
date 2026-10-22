import { toast } from "@/lib/toast";
import { getActionErrorMessage } from "@/lib/feedbackMessages";
import { useEffect,useRef,useState } from "react";
import authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";
import { InputClearButton,inputIconButtonClassName } from "@/components/common/InputClearButton";
import { Eye,EyeOff } from "lucide-react";

export const RecoveryCodeReceipt = ({ code, onContinue, continueLabel = "Continue to login" }: {
  code: string; onContinue: () => void; continueLabel?: string;
}) => {
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Keep this code private. Anyone with it can recover your account.</p>
    <code className="block select-all break-all rounded-lg border border-border bg-background p-4 text-center font-mono text-base tracking-wide">{code}</code>
    <Button type="button" variant="outline" className="w-full" onClick={async () => {
      try { await navigator.clipboard.writeText(code); setCopyStatus("Code copied. Keep it somewhere safe."); toast.success("Recovery code copied. Keep it private."); }
      catch { setCopyStatus("Select the code above and copy it manually."); toast.error("Could not copy the recovery code. Select it and copy it manually."); }
    }}>Copy Recovery Code</Button>
    {copyStatus && <p role="status" className="text-sm text-muted-foreground">{copyStatus}</p>}
    <div className="flex items-center gap-2">
      <Checkbox id="recovery-code-saved" checked={saved} onCheckedChange={value => setSaved(value === true)} />
      <Label htmlFor="recovery-code-saved" className="cursor-pointer text-sm">I saved my recovery code</Label>
    </div>
    <Button type="button" className="w-full" disabled={!saved} onClick={onContinue}>{continueLabel}</Button>
  </div>;
};

export const AccountRecovery = ({ mode = "reset", onBack }: { mode?: "reset" | "generate"; onBack: () => void }) => {
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const generate = mode === "generate";
  const clearErrors = (...fields: string[]) => setErrors(previous => {
    const next = { ...previous, form: "" };
    fields.forEach(field => { delete next[field]; });
    return next;
  });
  const fieldError = (field: string) => errors[field]
    ? <p id={`recovery-${field}-error`} role="alert" className="mt-0.5 text-xs text-destructive">{errors[field]}</p>
    : null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const nextErrors: Record<string, string> = {};
    if (!generate) {
      const normalizedCode = code.trim().replace(/[\s-]/g, "");
      if (!normalizedCode) nextErrors.code = "Recovery code is required";
      else if (!/^[A-Fa-f0-9]{32}$/.test(normalizedCode)) nextErrors.code = "Enter a valid recovery code";
    }
    if (!password) nextErrors.password = generate ? "Enter your current password" : "Password is required";
    else if (!generate && password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    if (!generate) {
      if (!confirmation) nextErrors.confirmation = "Please confirm your password";
      else if (confirmation !== password) nextErrors.confirmation = "Passwords do not match";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    const originalToken = authService.getToken();
    try {
      const result = generate ? await authService.replaceRecoveryCode(password) : await authService.recoverPassword({ recovery_code: code, new_password: password, confirm_password: confirmation });
      if (!active.current) return;
      if (generate && authService.getToken() !== originalToken) throw new Error("Your session changed. Log in and try again.");
      setReceipt(result.recovery_code); setPassword(""); setConfirmation(""); setCode("");
      toast.success(generate ? "Recovery code replaced. Save the new code." : "Password reset. Save your new recovery code.");
    } catch (failure) {
      if (!active.current) return;
      toast.error(generate ? "Could not replace your recovery code" : "Could not reset your password", { description: getActionErrorMessage(failure) });
      const response = (failure as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      const fieldNames: Record<string, string> = { recovery_code: "code", new_password: "password", confirm_password: "confirmation" };
      const mapped: Record<string, string> = {};
      const formErrors: string[] = [];
      response?.errors?.forEach(issue => {
        const field = fieldNames[issue.field];
        if (field) mapped[field] = issue.message;
        else formErrors.push(issue.message);
      });
      if (formErrors.length) mapped.form = formErrors.join(" ");
      else if (!Object.keys(mapped).length) mapped.form = response?.message || (failure instanceof Error ? failure.message : "Recovery failed. Please try again.");
      setErrors(mapped);
    }
    finally { if (active.current) setPending(false); }
  };
  if (receipt) return <div className="space-y-4">
    <p role="status" className="text-sm font-medium">{generate ? "Your previous recovery code has been replaced." : "Password updated. All previous sessions were signed out."}</p>
    <RecoveryCodeReceipt key={receipt} code={receipt} onContinue={() => { setReceipt(null); onBack(); }} continueLabel={generate ? "Done" : "Continue to login"} />
  </div>;
  return <form noValidate onSubmit={submit} className="space-y-4">
    {generate && <p className="text-sm text-muted-foreground">Confirm your GreenWay password to create a new recovery code. Any previous code will stop working.</p>}
    {!generate && <button type="button" disabled={pending} onClick={onBack} className="gw-action-link text-sm font-semibold transition-colors hover:underline">
      Back to Login
    </button>}
    {errors.form && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errors.form}</p>}
    {!generate && <>
      <div className="space-y-1.5">
        <Label htmlFor="recovery-code">Recovery Code</Label>
        <div className="relative">
          <Input id="recovery-code" autoComplete="off" spellCheck={false} placeholder="Enter your recovery code" value={code} disabled={pending} aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? "recovery-code-error" : undefined} onChange={event => { setCode(event.target.value); clearErrors("code"); }} className={`${code ? "pr-10" : ""} ${errors.code ? "border-destructive" : ""}`} />
          {code && !pending && <InputClearButton onClick={() => { setCode(""); clearErrors("code"); }} />}
        </div>
        {fieldError("code")}
      </div>
    </>}
    <div className="space-y-1.5">
      <Label htmlFor="recovery-password">{generate ? "Current Password" : "New Password"}</Label>
      <div className="relative">
        <Input id="recovery-password" type={showPassword ? "text" : "password"} autoComplete={generate ? "current-password" : "new-password"} placeholder={generate ? "Enter your current password" : "Enter a new password"} value={password} disabled={pending} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "recovery-password-error" : undefined} onChange={event => { setPassword(event.target.value); clearErrors("password", "confirmation"); }} className={`pr-10 [&::-ms-reveal]:hidden ${errors.password ? "border-destructive" : ""}`} />
        <Button type="button" variant="ghost" size="icon" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={pending} onClick={() => setShowPassword(value => !value)} className={inputIconButtonClassName}>
          {showPassword ? <EyeOff aria-hidden="true" className="h-3 w-3" /> : <Eye aria-hidden="true" className="h-3 w-3" />}
        </Button>
      </div>
      {fieldError("password")}
    </div>
    {!generate && <div className="space-y-1.5">
      <Label htmlFor="recovery-confirm">Confirm New Password</Label>
      <div className="relative">
        <Input id="recovery-confirm" type={showConfirmation ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your new password" value={confirmation} disabled={pending} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? "recovery-confirmation-error" : undefined} onChange={event => { setConfirmation(event.target.value); clearErrors("confirmation"); }} className={`pr-10 [&::-ms-reveal]:hidden ${errors.confirmation ? "border-destructive" : ""}`} />
        <Button type="button" variant="ghost" size="icon" title={showConfirmation ? "Hide confirm password" : "Show confirm password"} aria-label={showConfirmation ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmation} disabled={pending} onClick={() => setShowConfirmation(value => !value)} className={inputIconButtonClassName}>
          {showConfirmation ? <EyeOff aria-hidden="true" className="h-3 w-3" /> : <Eye aria-hidden="true" className="h-3 w-3" />}
        </Button>
      </div>
      {fieldError("confirmation")}
    </div>}
    <Button className="w-full" type="submit" loading={pending} loadingLabel="Please wait…" disabled={pending}>{generate ? "Create Recovery Code" : "Reset Password"}</Button>
    {generate && <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={onBack}>Cancel</Button>}
    {!generate && <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Lost your recovery code? Contact <a className="gw-action-link underline" href={MUNICIPAL_CONTACT.hotlineHref}>MENRO</a> for help.</p>}
  </form>;
};
