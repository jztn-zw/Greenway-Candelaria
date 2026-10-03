import { residentPageStyles } from "@/components/common/residentPageStyles";
import "./myReports.css";

const cardLayout = "my-reports-card flex min-w-0 w-full flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3 text-left";

export const myReportsStyles = {
  page: `${residentPageStyles.page} resident-my-reports max-w-[1200px]`,
  headerActions: "my-reports-header-actions",
  createButton: "h-9 max-w-full gap-1.5 px-3 text-xs [&_svg]:size-3.5",
  filterRow: "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
  sort: "my-reports-sort min-w-0 shrink-0",
  sortTrigger: "my-reports-sort-trigger h-9 gap-1.5 text-xs",
  list: "my-reports-list grid min-w-0 items-stretch gap-3",
  card: `${cardLayout} group transition-colors duration-150 cursor-pointer hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`,
  skeletonCard: `${cardLayout} cursor-default`,
  icon: "my-reports-icon flex size-9 shrink-0 items-center justify-center rounded-lg border [&_svg]:size-4",
  preview: "my-reports-preview line-clamp-2 break-words text-xs font-normal leading-relaxed text-muted-foreground [overflow-wrap:anywhere]",
  footer: "mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground",
} as const;
