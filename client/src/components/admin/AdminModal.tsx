import { forwardRef, type ComponentProps, type ElementRef } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { FormDialog } from "@/components/dialogs/FormDialog";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { UnsavedChangesDialog } from "@/components/dialogs/UnsavedChangesDialog";
import { cn } from "@/lib/utils";
import "./adminModal.css";

/** Shared admin presentation; Radix and the existing dialogs own interaction behavior. */
export const AdminModalContent = forwardRef<ElementRef<typeof DialogContent>, ComponentProps<typeof DialogContent>>(
  ({ className, ...props }, ref) => <DialogContent ref={ref} className={cn("admin-modal", className)} {...props} />,
);
AdminModalContent.displayName = "AdminModalContent";

export const AdminModal = ({ className, tone = "default", ...props }: ComponentProps<typeof FormDialog> & {
  tone?: "default" | "warning" | "danger";
}) => <FormDialog className={cn("admin-modal", `admin-modal-${tone}`, className)} {...props} />;

export const AdminConfirmationDialog = ({ className, ...props }: ComponentProps<typeof ConfirmationDialog>) => (
  <ConfirmationDialog className={cn("admin-modal admin-modal-confirmation", className)} {...props} />
);

export const AdminUnsavedChangesDialog = ({ className, ...props }: ComponentProps<typeof UnsavedChangesDialog>) => (
  <UnsavedChangesDialog className={cn("admin-modal admin-modal-confirmation", className)} {...props} />
);
