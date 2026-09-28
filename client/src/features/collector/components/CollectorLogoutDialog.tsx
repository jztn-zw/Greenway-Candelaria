import { LogOut } from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const CollectorLogoutDialog = ({ open, onOpenChange, onConfirm }: Props) => (
  <ConfirmationDialog kind="dialog" open={open} onOpenChange={onOpenChange}
    title="Log Out of GreenWay?" description="Sign out of your current collector session?"
    icon={<LogOut />} variant="destructive" confirmLabel="Log Out" onConfirm={onConfirm} />
);

export default CollectorLogoutDialog;
