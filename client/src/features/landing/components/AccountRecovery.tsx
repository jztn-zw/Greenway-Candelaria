import { useEffect,useRef,useState } from "react";
import authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";

export const RecoveryCodeReceipt = ({ code, onContinue, continueLabel = "Continue to login" }: {
  code: string; onContinue: () => void; continueLabel?: string;
}) => {
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Save this code somewhere private. It lets you reset your password without email or a phone. Anyone with it can recover your account.</p>
    <code className="block select-all break-all rounded-lg border border-border bg-background p-4 text-center font-mono text-base tracking-wide">{code}</code>
    <Button type="button" variant="outline" className="w-full" onClick={async () => {
      try { await navigator.clipboard.writeText(code); setCopyStatus("Code copied. Keep it somewhere safe."); }
      catch { setCopyStatus("Select the code above and copy it manually."); }
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
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const generate = mode === "generate";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!password || (!generate && (password.length < 8 || confirmation !== password))) {
      setError(generate ? "Enter your current password." : "Use at least 8 characters and make both passwords match."); return;
    }
    setPending(true); setError("");
    const originalToken = authService.getToken();
    try {
      const result = generate ? await authService.replaceRecoveryCode(password) : await authService.recoverPassword({ identifier: identifier.trim(), recovery_code: code, new_password: password, confirm_password: confirmation });
      if (!active.current) return;
      if (generate && authService.getToken() !== originalToken) throw new Error("Your session changed. Log in and try again.");
      setReceipt(result.recovery_code); setPassword(""); setConfirmation(""); setCode("");
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : "Recovery failed. Please try again."); }
    finally { if (active.current) setPending(false); }
  };
  if (receipt) return <div className="space-y-4">
    <p role="status" className="text-sm font-medium">{generate ? "Your previous recovery code has been replaced." : "Password updated. All previous sessions were signed out."}</p>
    <RecoveryCodeReceipt key={receipt} code={receipt} onContinue={() => { setReceipt(null); onBack(); }} continueLabel={generate ? "Done" : "Continue to login"} />
  </div>;
  return <form noValidate onSubmit={submit} className="space-y-4">
    <p className="text-sm text-muted-foreground">{generate ? "Confirm your GreenWay password to create a new recovery code. Any previous code will stop working." : "Use the recovery code you saved when creating your account."}</p>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!generate && <>
      <div className="space-y-1.5"><Label htmlFor="recovery-identifier">Username or Email</Label><Input id="recovery-identifier" autoComplete="username" value={identifier} disabled={pending} onChange={event => setIdentifier(event.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor="recovery-code">Recovery Code</Label><Input id="recovery-code" autoComplete="off" spellCheck={false} value={code} disabled={pending} onChange={event => setCode(event.target.value)} /></div>
    </>}
    <div className="space-y-1.5"><Label htmlFor="recovery-password">{generate ? "Current Password" : "New Password"}</Label><Input id="recovery-password" type="password" autoComplete={generate ? "current-password" : "new-password"} value={password} disabled={pending} onChange={event => setPassword(event.target.value)} /></div>
    {!generate && <div className="space-y-1.5"><Label htmlFor="recovery-confirm">Confirm New Password</Label><Input id="recovery-confirm" type="password" autoComplete="new-password" value={confirmation} disabled={pending} onChange={event => setConfirmation(event.target.value)} /></div>}
    <Button className="w-full" type="submit" loading={pending} loadingLabel="Please wait…" disabled={pending || (!generate && (!identifier.trim() || !code.trim()))}>{generate ? "Create Recovery Code" : "Reset Password"}</Button>
    <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={onBack}>{generate ? "Cancel" : "Back to Login"}</Button>
    {!generate && <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">No recovery code? Contact <a className="gw-action-link underline" href={MUNICIPAL_CONTACT.hotlineHref}>{MUNICIPAL_CONTACT.officeName}</a> for assistance. Your name or phone number alone cannot reset a password.</p>}
  </form>;
};
