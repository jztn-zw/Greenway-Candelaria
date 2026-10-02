import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePendingAction } from "@/hooks/usePendingAction";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  iconVariant?: "default" | "destructive";
  confirmLabel: ReactNode;
  /** Return the request promise to keep loading and duplicate protection active until it settles. */
  onConfirm: () => void | Promise<unknown>;
  cancelLabel?: ReactNode;
  onCancel?: () => void;
  cancelVariant?: "outline" | "destructive";
  isPending?: boolean;
  pendingLabel?: string;
  confirmDisabled?: boolean;
  closeOnConfirm?: boolean;
  kind?: "alert" | "dialog";
  closeLabel?: string;
  className?: string;
  children?: ReactNode;
}

/** A reusable confirmation layout using GreenWay's theme and radius tokens. */
export const ConfirmationDialog = ({
  open, onOpenChange, title, description, icon = <AlertTriangle />,
  variant = "default", iconVariant = variant, confirmLabel, onConfirm, cancelLabel = "Cancel", onCancel,
  cancelVariant = "outline", isPending = false, pendingLabel = "Please wait...",
  confirmDisabled = false, closeOnConfirm = false, kind = "alert",
  closeLabel = "Close confirmation", className, children,
}: ConfirmationDialogProps) => {
  const confirmation = usePendingAction();
  const pending = isPending || confirmation.isPending;
  const Root = kind === "alert" ? AlertDialog : Dialog;
  const Content = kind === "alert" ? AlertDialogContent : DialogContent;
  const Title = kind === "alert" ? AlertDialogTitle : DialogTitle;
  const Description = kind === "alert" ? AlertDialogDescription : DialogDescription;
  const Cancel = kind === "alert" ? AlertDialogCancel : Button;
  const Action = kind === "alert" ? AlertDialogAction : Button;
  const handleOpenChange = (nextOpen: boolean) => {
    if (!pending) onOpenChange(nextOpen);
  };

  return (
    <Root open={open} onOpenChange={handleOpenChange}>
      <Content className={cn("z-[100] flex max-h-[90dvh] w-[92vw] flex-col gap-0 overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 text-left shadow-2xl sm:max-w-md sm:p-6 [&>button:last-child]:hidden", className)}>
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
          <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border [&_svg]:size-5", iconVariant === "destructive" ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/10 text-primary")}>{icon}</span>
          <button type="button" onClick={() => handleOpenChange(false)} disabled={pending} aria-label={closeLabel} className="gw-action-ghost -mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-w-0 space-y-2">
          <Title className="gw-heading break-words text-base leading-snug tracking-tight text-foreground sm:text-base">{title}</Title>
          <Description className="break-words text-ui-label leading-relaxed text-muted-foreground sm:text-ui-label">{description}</Description>
        </div>
        {children && <div className="mt-4 space-y-3 text-ui-label leading-relaxed text-muted-foreground">{children}</div>}
        <div className="mt-5 flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-border/60 pt-4">
          <Cancel variant={cancelVariant} type="button" disabled={pending} onClick={() => { if (onCancel) onCancel(); else handleOpenChange(false); }} className="h-9 rounded-lg px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{cancelLabel}</Cancel>
          <Action variant={variant} type="button" disabled={pending || confirmDisabled} onClick={(event) => {
            event.preventDefault();
            if (pending || confirmDisabled) return;
            void confirmation.run(() => {
              const result = onConfirm();
              if (result && typeof result.then === "function") {
                return result.then((value) => {
                  if (closeOnConfirm && value !== false) onOpenChange(false);
                });
              }
              if (closeOnConfirm) onOpenChange(false);
            }).catch(() => {
              // The action owns its error message; keep the dialog open for retry.
            });
          }} className="h-9 gap-1.5 rounded-lg px-5 text-xs font-semibold shadow-2xs" loading={pending} loadingLabel={pendingLabel}>

            {confirmLabel}
          </Action>
        </div>
      </Content>
    </Root>
  );
};

export default ConfirmationDialog;
