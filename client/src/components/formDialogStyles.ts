import { fieldStyles } from "./ui/fieldStyles";

/** Shared layout tokens for admin, collector, and resident form/detail dialogs. */
export const formDialogStyles = {
  content: "flex max-h-[90dvh] w-[92vw] flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 text-left shadow-2xl sm:max-w-md sm:p-0 [&>button:last-child]:hidden",
  header: "gw-modal-header flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-5 py-4",
  title: "gw-card-title text-foreground",
  description: "mt-0.5 text-ui-label leading-relaxed text-muted-foreground",
  icon: "flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary [&_svg]:size-5",
  body: "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4",
  footer: "gw-modal-footer flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-border/60 bg-card px-5 py-3.5",
  label: "text-ui-label font-medium text-foreground",
  input: fieldStyles.compact,
  select: fieldStyles.compact,
  textarea: `${fieldStyles.compact} min-h-24 resize-none leading-relaxed`,
  cancelButton: "h-9 rounded-lg border-border/80 px-4 text-xs font-medium transition-colors",
  primaryButton: "h-9 gap-1.5 rounded-lg px-5 text-xs font-semibold shadow-2xs transition-colors",
} as const;
