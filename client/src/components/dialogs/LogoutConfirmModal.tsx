import { LogOut } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";

interface LogoutConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<unknown>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoggingOut?: boolean;
  descriptionInHeader?: boolean;
}

const LogoutConfirmModal = ({ open, onOpenChange, onConfirm, title = "Sign Out of This Tab?",
  description = "You can sign in again here. Other tabs will stay signed in.", confirmLabel = "Sign Out", isLoggingOut = false,
}: LogoutConfirmModalProps) => (
  <ConfirmationDialog kind="dialog" open={open} onOpenChange={onOpenChange} title={title} description={description}
    icon={<LogOut />} variant="destructive" confirmLabel={confirmLabel} onConfirm={onConfirm}
    isPending={isLoggingOut} pendingLabel="Logging out..." />
);

export default LogoutConfirmModal;
