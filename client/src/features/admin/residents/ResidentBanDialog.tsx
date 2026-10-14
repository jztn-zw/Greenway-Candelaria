import { useState } from "react";
import { Ban, UserCheck } from "lucide-react";
import { profileAvatarForAccount, profileAvatarImageSrc } from "@/components/common/profileAvatars";
import { FormDialog } from "@/components/dialogs/FormDialog";
import { formDialogStyles } from "@/components/dialogs/formDialogStyles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePendingAction } from "@/hooks/usePendingAction";
import type { Resident } from "./types";

interface Props {
  resident: Resident;
  onClose: () => void;
  onConfirm: (resident: Resident, reason?: string) => Promise<void>;
}

export default function ResidentBanDialog({ resident, onClose, onConfirm }: Props) {
  const banning = resident.status === "Active";
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const action = usePendingAction();
  const saving = action.isPending;
  const disabled = resident.status === "Deactivated" || (banning && !reason.trim());
  const submit = () => {
    if (saving || disabled) return;
    void action.run(async () => {
      setError("");
      try {
        await onConfirm(resident, banning ? reason.trim() : undefined);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update this account. Please try again.");
      }
    });
  };
  return (
    <FormDialog
      open onOpenChange={(open) => { if (!open) onClose(); }} pending={saving}
      className="z-[100]"
      title={banning ? "Ban Resident" : "Unban Resident"}
      icon={banning ? <Ban /> : <UserCheck />}
      description={banning
        ? "Record a reason for restricting this account."
        : "Restore access to GreenWay. The resident will need to sign in again."}
      closeLabel={banning ? "Close ban resident" : "Close unban resident"}
      footer={<>
        <Button type="button" variant="outline" className={formDialogStyles.cancelButton} disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="button" variant={banning ? "destructive" : "default"} className={formDialogStyles.primaryButton}
          disabled={disabled} loading={saving} loadingLabel={banning ? "Banning resident…" : "Unbanning resident…"} onClick={submit}>
          {banning ? "Ban Resident" : "Unban Resident"}
        </Button>
      </>}
    >
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
        <div className="size-9 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10">
          <img src={profileAvatarImageSrc(profileAvatarForAccount(resident.id, resident.avatarUrl))} alt="" decoding="async" className="block h-full w-full object-cover object-center" />
        </div>
        <div className="min-w-0">
          <p className="break-words text-ui-label font-semibold leading-snug text-foreground">{resident.fullName}</p>
          <p className="mt-0.5 break-words text-ui-caption text-muted-foreground">{resident.username ? `@${resident.username}` : "Resident account"}</p>
        </div>
      </div>
      {banning && <p className="text-ui-label leading-relaxed text-muted-foreground">Active sessions will end and sign-in will be blocked. Reports and account records will be preserved.</p>}
      {banning && <div className="space-y-2">
        <Label htmlFor="resident-ban-reason" className={formDialogStyles.label}>Ban Reason</Label>
        <Textarea id="resident-ban-reason" value={reason} onChange={(event) => setReason(event.target.value)}
          maxLength={255} required disabled={saving} rows={3}
          className={formDialogStyles.textarea}
          placeholder="Enter the reason for banning this account…" />
      </div>}
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 break-words text-ui-caption leading-relaxed text-destructive">{error}</p>}
    </FormDialog>
  );
}
