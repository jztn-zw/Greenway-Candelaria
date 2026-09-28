import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { formDialogStyles } from "./formDialogStyles";

interface FormDialogHeaderProps {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  disabled?: boolean;
}

export const FormDialogHeader = ({ title, description, icon, onClose, closeLabel = "Close dialog", disabled = false }: FormDialogHeaderProps) => (
  <div className={formDialogStyles.header}>
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {icon && <span className={formDialogStyles.icon} aria-hidden="true">{icon}</span>}
      <div className="min-w-0 flex-1">
        <DialogTitle className={formDialogStyles.title}>{title}</DialogTitle>
        <DialogDescription className={formDialogStyles.description}>{description}</DialogDescription>
      </div>
    </div>
    <button type="button" onClick={onClose} disabled={disabled} aria-label={closeLabel} className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"><X className="size-4" /></button>
  </div>
);

interface FormDialogProps extends Omit<FormDialogHeaderProps, "onClose" | "disabled"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const FormDialog = ({ open, onOpenChange, pending = false, className, children, footer, ...header }: FormDialogProps) => (
  <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
    <DialogContent className={cn(formDialogStyles.content, className)}>
      <FormDialogHeader {...header} disabled={pending} onClose={() => { if (!pending) onOpenChange(false); }} />
      <div className={formDialogStyles.body}>{children}</div>
      {footer && <div className={formDialogStyles.footer}>{footer}</div>}
    </DialogContent>
  </Dialog>
);

