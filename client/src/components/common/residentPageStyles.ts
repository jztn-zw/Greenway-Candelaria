import "./residentPage.css";

export const residentPageStyles = {
  page: "resident-page mx-auto min-w-0 w-full pb-4",
  header: "resident-page-header mb-4 flex min-w-0 flex-col items-start gap-3",
  heading: "min-w-0 max-w-full",
  actions: "flex max-w-full shrink-0 flex-wrap items-center gap-2",
  title: "resident-page-title font-display font-semibold leading-tight tracking-tight text-foreground",
  description: "resident-page-description mt-1 max-w-prose text-muted-foreground leading-relaxed",
} as const;
