import "./dashboard.css";

const panel = "admin-dashboard-panel min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs";

/** Keep the dashboard and its loading state on the same responsive geometry. */
export const adminDashboardStyles = {
  page: "admin-dashboard mx-auto min-w-0 w-full max-w-[1600px] space-y-4 pb-6",
  panel,
  header: `${panel} admin-dashboard-header`,
  headerRow: "admin-dashboard-header-row flex min-w-0 flex-col justify-between gap-4",
  title: "admin-dashboard-title gw-page-title break-words text-foreground [overflow-wrap:anywhere]",
  headerActions: "admin-dashboard-header-actions flex min-w-0 flex-wrap items-center gap-2 border-t border-border/60 pt-3",
  headerAction: "admin-dashboard-header-action h-8 max-w-full gap-1.5 px-2.5 text-[11px] [&_svg]:size-3.5",
  kpis: "admin-dashboard-kpis grid min-w-0 grid-cols-2 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs",
  kpi: "admin-dashboard-kpi min-w-0 p-3.5 flex flex-col justify-between gap-2.5",
  charts: "admin-dashboard-charts grid min-w-0 grid-cols-1 gap-4 items-stretch",
  chart: `${panel} admin-dashboard-chart flex flex-col justify-between`,
  chartHeader: "flex min-w-0 flex-wrap items-start justify-between gap-2 pb-3",
  chartCanvas: "h-[185px] min-w-0 w-full aspect-auto pt-2",
  operations: "admin-dashboard-operations grid min-w-0 grid-cols-1 gap-4 items-stretch",
  recent: "admin-dashboard-recent grid min-w-0 grid-cols-1 gap-4 items-stretch",
  reports: `${panel} admin-dashboard-reports flex h-full flex-col`,
  attention: "admin-dashboard-attention relative min-w-0 rounded-2xl border border-border/80 bg-card shadow-2xs",
  attentionInner: "admin-dashboard-attention-inner flex min-h-0 flex-col p-4",
  attentionList: "admin-dashboard-attention-list min-h-0 overflow-y-auto overscroll-contain pr-2 space-y-3",
  sectionHeader: "admin-dashboard-section-header mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3",
  sectionTitle: "gw-heading min-w-0 break-words text-base leading-snug text-foreground tracking-tight",
  sectionAction: "group h-8 max-w-full shrink-0 gap-1.5 px-2 text-[11px] [&_svg]:size-3.5",
  calendar: `${panel} admin-dashboard-calendar`,
  calendarDays: "admin-dashboard-calendar-days grid grid-cols-7 gap-1 min-h-0",
  calendarDay: "admin-dashboard-calendar-day relative min-w-0 flex min-h-11 flex-col justify-between rounded-lg border p-1 text-left",
  reportCards: "admin-dashboard-report-cards space-y-2",
  reportCard: "group block min-w-0 space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-left",
  reportTable: "admin-dashboard-report-table overflow-hidden rounded-xl border border-border/60 bg-muted/20",
  activity: `${panel} admin-dashboard-activity flex h-full flex-col`,
  activityList: "admin-dashboard-activity-list h-[275px] pr-2",
} as const;
