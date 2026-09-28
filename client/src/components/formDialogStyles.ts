/** Shared layout tokens for admin, collector, and resident form/detail dialogs. */
export const formDialogStyles = {
  content: "flex max-h-[90dvh] w-[92vw] flex-col gap-0 overflow-hidden rounded-lg border border-border/80 bg-background p-0 text-left shadow-2xl sm:max-w-md sm:rounded-lg sm:p-0 [&>button:last-child]:hidden",
  header: "flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-4",
  title: "font-display text-base font-semibold leading-snug tracking-tight text-foreground sm:text-base",
  description: "mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-xs",
  icon: "flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary [&_svg]:size-5",
  body: "min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-4",
  footer: "flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-border/60 bg-muted/20 px-5 py-3.5",
  label: "text-xs font-semibold text-foreground",
  input: "h-9 rounded-md border-border/80 bg-background px-3 text-xs shadow-2xs md:text-xs",
  select: "h-9 rounded-md border-border/80 bg-background px-3 text-xs shadow-2xs sm:text-xs",
  textarea: "min-h-24 resize-none rounded-md border-border/80 bg-background px-3 py-2.5 text-xs leading-relaxed shadow-2xs",
  cancelButton: "h-9 rounded-md border-border/80 px-4 text-xs font-semibold",
  primaryButton: "h-9 gap-1.5 rounded-md px-4 text-xs font-semibold",
} as const;
