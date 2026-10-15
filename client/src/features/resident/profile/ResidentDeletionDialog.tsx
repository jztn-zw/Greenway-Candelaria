import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRetryAfterSeconds } from "@/lib/rateLimit";
import { toast } from "@/lib/toast";
import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";

export default function ResidentDeletionDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const writes = useIsMutating({ predicate: (mutation) => mutation.meta?.residentUserId === userId });
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setSeconds(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return <ConfirmationDialog
    kind="dialog" open onOpenChange={(open) => { if (!open) onClose(); }}
    title="Delete Account?" icon={<Trash2 />} variant="destructive"
    description="Permanently remove your profile and contact details and sign out of all devices. Submitted reports and audit history will remain for municipal records. This cannot be undone."
    confirmLabel="Delete Account" pendingLabel="Deleting account…" isPending={saving}
    confirmDisabled={!password || seconds > 0 || writes > 0}
    onConfirm={async () => {
      if (saving || !password || seconds > 0 || writes > 0) return false;
      const session = useAuthStore.getState();
      const isCurrent = () => useAuthStore.getState().token === session.token && useAuthStore.getState().user?.id === session.user?.id;
      if (!session.token || session.user?.role !== "RESIDENT") return false;
      setSaving(true); setError("");
      try {
        await client.cancelQueries({ predicate: ({ queryKey }) => queryKey[0] === "resident" && queryKey[1] === session.user?.id });
        if (!isCurrent()) return false;
        await authService.deleteAccount(password);
        if (!isCurrent()) return false;
        // Navigate before clearing auth so the protected route cannot flash the login dialog.
        flushSync(() => navigate("/", { replace: true }));
        useAuthStore.getState().clearAuth();
        toast.success("Your account has been deleted.");
      } catch (err) {
        if (!isCurrent()) return false;
        const failure = err as { response?: { status?: number; data?: { retryAfterSeconds?: number; message?: string }; headers?: Record<string, unknown> }; retryAfterSeconds?: number };
        if (failure.response?.status === 429) {
          const wait = getRetryAfterSeconds(failure.retryAfterSeconds ?? failure.response.data?.retryAfterSeconds, failure.response.headers?.["retry-after"]);
          setSeconds(wait); setDeadline(performance.now() + wait * 1000);
        } else setError(failure.response?.data?.message || (err instanceof Error ? err.message : "Could not delete your account. Please try again."));
        return false;
      } finally { setSaving(false); }
    }}
  >
    <div className="space-y-2">
      <Label htmlFor="deletion-password">Current Password</Label>
      <div className="relative">
        <Input id="deletion-password" type={visible ? "text" : "password"} autoComplete="current-password"
          value={password} onChange={(event) => setPassword(event.target.value)} maxLength={255} required
          disabled={saving} className="pr-11" aria-invalid={Boolean(error)} aria-describedby={error ? "deletion-error" : undefined} />
        <Button type="button" variant="ghost" size="icon" disabled={saving} className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
          aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
    {writes > 0 && <p role="status" className="text-xs text-muted-foreground">Please wait for your changes to finish saving.</p>}
    {error && <p id="deletion-error" role="alert" className="break-words text-xs text-destructive">{error}</p>}
    {seconds > 0 && <p role="alert" className="text-xs text-warning-foreground">Too many attempts. Try again in <span role="timer" aria-live="off" className="tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>.</p>}
  </ConfirmationDialog>;
}
