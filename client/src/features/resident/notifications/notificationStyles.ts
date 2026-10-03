import { residentPageStyles } from "@/components/common/residentPageStyles";
import "./notifications.css";

const rowLayout = "resident-notification-row flex w-full min-w-0 items-start gap-2.5 border-l-2 p-3 text-left";

export const notificationStyles = {
  page: `${residentPageStyles.page} resident-notifications max-w-[1200px] animate-in fade-in duration-300`,
  headerActions: "resident-notification-header-actions",
  filterRow: "flex min-w-0 items-center gap-2",
  menuTrigger: "resident-notification-menu-trigger size-9 shrink-0 rounded-lg [&_svg]:size-4",
  actionButton: "h-9 max-w-full gap-1.5 px-3 text-xs [&_svg]:size-3.5",
  list: "min-w-0 overflow-hidden rounded-2xl border border-border/80 divide-y bg-card",
  row: `${rowLayout} group transition-colors cursor-pointer hover:bg-[var(--button-neutral-hover)] active:bg-[var(--button-neutral-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`,
  skeletonRow: `${rowLayout} border-l-transparent cursor-default`,
  icon: "resident-notification-icon mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border [&_svg]:size-4",
  message: "line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]",
  trailing: "flex w-4 shrink-0 self-center items-center justify-center",
} as const;
