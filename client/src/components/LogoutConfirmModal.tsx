import { LogOut } from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

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

const LogoutConfirmModal = ({ open, onOpenChange, onConfirm, title = "Log Out of GreenWay?",
  description = "Sign out of your current session?", confirmLabel = "Log Out", isLoggingOut = false,
}: LogoutConfirmModalProps) => (
  <ConfirmationDialog kind="dialog" open={open} onOpenChange={onOpenChange} title={title} description={description}
    icon={<LogOut />} variant="destructive" confirmLabel={confirmLabel} onConfirm={onConfirm}
    isPending={isLoggingOut} pendingLabel="Logging out..." />
);

export default LogoutConfirmModal;
