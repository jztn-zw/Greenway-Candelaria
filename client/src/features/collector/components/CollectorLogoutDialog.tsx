import { LogOut } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<unknown>;
}

const CollectorLogoutDialog = ({ open, onOpenChange, onConfirm }: Props) => (
  <ConfirmationDialog kind="dialog" open={open} onOpenChange={onOpenChange}
    title="Sign Out of This Tab?" description="You can sign in again here. Other tabs will stay signed in."
    icon={<LogOut />} variant="destructive" confirmLabel="Sign Out" onConfirm={onConfirm} pendingLabel="Logging out…" />
);

export default CollectorLogoutDialog;
