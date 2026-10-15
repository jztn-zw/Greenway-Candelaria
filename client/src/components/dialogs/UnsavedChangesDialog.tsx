import { AlertTriangle } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";

export interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave?: () => void;
  title?: string;
  description?: string;
  discardLabel?: string;
  keepEditingLabel?: string;
  saveLabel?: string;
  isSaving?: boolean;
  className?: string;
}

export const UnsavedChangesDialog = ({
  isOpen, onClose, onDiscard, onSave, title = "Unsaved Changes?",
  description = "You have unsaved changes in this form. If you close now, your edits will be discarded.",
  discardLabel = "Discard Changes", keepEditingLabel = "Keep Editing",
  saveLabel = "Save Changes", isSaving = false, className,
}: UnsavedChangesDialogProps) => (
  <ConfirmationDialog
    className={className}
    kind="dialog"
    open={isOpen}
    onOpenChange={(open) => { if (!open) onClose(); }}
    title={title}
    description={description}
    icon={<AlertTriangle />}
    iconVariant="destructive"
    variant={onSave ? "default" : "destructive"}
    cancelLabel={onSave ? discardLabel : keepEditingLabel}
    cancelVariant={onSave ? "destructive" : "outline"}
    onCancel={onSave ? onDiscard : onClose}
    confirmLabel={onSave ? saveLabel : discardLabel}
    onConfirm={onSave || onDiscard}
    isPending={isSaving}
    pendingLabel="Saving..."
    closeLabel="Keep editing"
  />
);

export default UnsavedChangesDialog;
