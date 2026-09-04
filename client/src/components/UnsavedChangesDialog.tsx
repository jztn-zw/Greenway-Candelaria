import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Loader2, Trash2 } from "lucide-react";

export interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void; // Keep editing
  onDiscard: () => void; // Discard edits / Delete draft
  onSave?: () => void; // Optional save action (e.g. Save as Draft)
  title?: string;
  description?: string;
  discardLabel?: string;
  keepEditingLabel?: string;
  saveLabel?: string;
  isSaving?: boolean;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  title = "Unsaved Changes?",
  description = "You have unsaved changes in this form. If you close now, your edits will be discarded.",
  discardLabel = "Discard Changes",
  keepEditingLabel = "Keep Editing",
  saveLabel = "Save Changes",
  isSaving = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
              {title}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-3">
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-border/60">
          {onSave ? (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={onDiscard}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 shadow-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{discardLabel}</span>
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSaving ? "Saving..." : saveLabel}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {keepEditingLabel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onDiscard}
                className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{discardLabel}</span>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnsavedChangesDialog;
