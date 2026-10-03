import { residentPageStyles } from "@/components/common/residentPageStyles";
import "./tracking.css";

// Keep the tracking screen and its loading state on the same responsive layout.
export const trackingStyles = {
  page: `${residentPageStyles.page} resident-tracking max-w-[1440px]`,
  stack: "space-y-4",
  schedule: "resident-tracking-schedule flex min-w-0 flex-col items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs",
  scheduleDetails: "resident-tracking-schedule-details min-w-0 w-full space-y-3",
  scheduleHeading: "resident-tracking-schedule-heading flex min-w-0 flex-col items-start gap-2",
  scheduleTitle: "gw-heading break-words text-sm leading-5 text-foreground tracking-tight",
  scheduleBadge: "inline-flex max-w-full items-center text-[10px] leading-normal font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md border break-words",
  scheduleMeta: "resident-tracking-schedule-meta flex flex-col gap-2 text-xs text-muted-foreground",
  reminder: "resident-tracking-reminder flex w-full min-w-0 items-start gap-2 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground",
  mapHeight: "resident-tracking-map-height min-w-0",
  mapShell: "resident-tracking-map-shell relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm [&_.leaflet-control-attribution]:!hidden",
  mapCanvas: "resident-tracking-map-canvas relative order-2 min-h-0 flex-1",
  mapStatus: "resident-tracking-map-status order-1 min-w-0 shrink-0 border-b border-border/60 px-4 py-3",
  statusCard: "resident-tracking-status-card min-w-0 space-y-2.5",
  statusHeading: "gw-heading break-words text-sm leading-snug text-foreground tracking-tight",
  statusDescription: "text-xs leading-relaxed text-muted-foreground",
  zoom: "absolute right-3 top-3 z-[500] flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card/95 p-0.5 shadow-sm backdrop-blur-md",
  zoomButton: "gw-action-ghost flex h-9 w-9 touch-manipulation select-none items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  mapFooter: "resident-tracking-map-footer order-3 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/60 bg-card px-3 py-2",
  legend: "resident-tracking-legend flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-muted-foreground",
  actions: "resident-tracking-map-actions ml-auto flex items-center gap-1",
  actionButton: "gw-action-ghost flex min-h-9 min-w-9 touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
} as const;
