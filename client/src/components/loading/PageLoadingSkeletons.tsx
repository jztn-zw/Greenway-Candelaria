import "@/features/collector/route-map/collectorRouteMap.css";
import "@/features/collector/dashboard/collectorDashboard.css";
import "@/features/collector/route-history/collectorRouteHistory.css";
import { AdminToolbarFilterSkeleton } from "@/components/admin/AdminFilterDialog";
import { AdminKpiSkeleton } from "@/components/admin/AdminKpiCards";
import { adminProfileStyles as adminProfile } from "@/features/admin/profile/adminProfileStyles";
import { collectorProfileStyles as collectorProfile } from "@/features/collector/profile/collectorProfileStyles";
import { adminAlertOptions, adminSettingsCopy, adminSettingsStyles } from "@/features/admin/settings/adminSettingsStyles";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/common/BackButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getManilaNow } from "@/utils/date";
import { communityContentStyles as contentStyles, adminCommunityStyles as postStyles, adminScheduleStyles as scheduleStyles, adminRouteStyles as routeStyles, adminBarangayStyles as barangayStyles, adminResidentManagerStyles as residentManagerStyles, adminCollectorManagerStyles as collectorManagerStyles } from "@/components/common/communityContentStyles";
import { residentPageStyles } from "@/components/common/residentPageStyles";
import { ResidentPageHeaderSkeleton } from "@/components/common/ResidentPageHeader";
import { myReportsStyles } from "@/features/resident/waste-reporting/myReportsStyles";
import { notificationStyles } from "@/features/resident/notifications/notificationStyles";
import { scheduledTrackingContent } from "@/features/resident/truck-tracking/trackingContent";
import { trackingStyles } from "@/features/resident/truck-tracking/trackingStyles";
import { dashboardStyles } from "@/features/resident/dashboard/dashboardStyles";
import { profileStyles } from "@/features/resident/profile/profileStyles";
import { settingsStyles } from "@/features/resident/settings/settingsStyles";
import { reportDetailStyles } from "@/features/resident/waste-reporting/reportDetailStyles";
import { adminDashboardStyles as adminStyles } from "@/features/admin/dashboard/dashboardStyles";
import { adminWasteReportStyles as wasteReportStyles } from "@/components/common/communityContentStyles";
import { adminTruckTrackingStyles as truckTrackingStyles } from "@/components/common/communityContentStyles";
import { adminAnalyticsStyles as analyticsStyles } from "@/components/common/communityContentStyles";
import { adminAuditLogStyles as auditStyles } from "@/components/common/communityContentStyles";

/* ─── Admin Dashboard Skeletons ─── */

export const KPICardsSkeleton = AdminKpiSkeleton;

export const TrendChartsSkeleton = () => (
  <div className={adminStyles.charts}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className={adminStyles.chart}>
        <div className={cn(adminStyles.chartHeader, i === 1 && "pb-2")}>
          <div className="min-w-0 space-y-1">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-lg" />
        </div>
        {i === 1 ? (
          <>
            <div className="h-[145px] flex items-center justify-center">
              <div className="h-32 w-32 rounded-full border-[20px] border-muted" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border/60">
              {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-7 rounded-lg" />)}
            </div>
          </>
        ) : <Skeleton className={`${adminStyles.chartCanvas} rounded-xl`} />}
      </div>
    ))}
  </div>
);

export const OperationsAndAttentionSkeleton = () => (
  <div className={adminStyles.operations}>
    <div className={adminStyles.panel}>
      <DashboardSectionHeaderSkeleton />
      <div className="mb-3 p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-40 max-w-[55%]" />
          <Skeleton className="h-4 w-32 max-w-[40%]" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
              <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-36 max-w-[55%]" />
                <Skeleton className="h-4 w-24 max-w-[40%]" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="mt-3 h-9 w-full rounded-xl" />
    </div>
    <div className={adminStyles.attention}>
      <div className={adminStyles.attentionInner}>
      <DashboardSectionHeaderSkeleton badge />
      <div className={`${adminStyles.attentionList} overflow-hidden`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-52 max-w-full" />
                <Skeleton className="h-3.5 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 shrink-0 self-end sm:self-auto rounded-xl" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-border/60 pt-3">
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      </div>
    </div>
  </div>
);

export const ReportsTableSkeleton = () => (
  <div className={adminStyles.reports}>
    <DashboardSectionHeaderSkeleton />
    <div className={adminStyles.reportCards}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={adminStyles.reportCard}>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-5 w-20 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-4 w-36 max-w-full" />
          <div className="flex min-w-0 flex-wrap gap-2 border-t border-border/50 pt-2">
            <Skeleton className="h-3 w-28 max-w-full" /><Skeleton className="h-3 w-16 max-w-full" />
          </div>
        </div>
      ))}
    </div>
    <div className={adminStyles.reportTable}>
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_0.9fr] sm:grid-cols-[1.2fr_1.4fr_1fr_0.6fr_0.9fr] gap-4 h-10 items-center border-b border-border/60 bg-muted/30 px-3 sm:px-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={cn("h-3.5 w-16 max-w-full", i === 3 && "hidden sm:block")} />)}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1.2fr_1.4fr_1fr_0.9fr] sm:grid-cols-[1.2fr_1.4fr_1fr_0.6fr_0.9fr] gap-4 items-center border-b border-border/60 last:border-b-0 px-3 sm:px-4 py-3.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className={cn("max-w-full", j === 1 || j === 4 ? "h-6 w-28 rounded-md" : "h-4 w-28", j === 3 && "hidden sm:block")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ActivityFeedSkeleton = () => (
  <div className={adminStyles.activity}>
    <DashboardSectionHeaderSkeleton />
    <div className={`${adminStyles.activityList} overflow-hidden space-y-3`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-36 max-w-[60%]" />
            <Skeleton className="h-6 w-16 shrink-0 rounded-md" />
          </div>
          <div className="flex justify-between gap-3 pl-3">
            <Skeleton className="h-3.5 w-32 max-w-[65%]" />
            <Skeleton className="h-3.5 w-12 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const CalendarSkeleton = ({ asOfDate, className }: { asOfDate?: string; className?: string }) => {
  const date = new Date(`${asOfDate || getManilaNow().dateKey}T12:00:00Z`);
  const firstDayIndex = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1).getDay();
  const daysInMonth = new Date(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getDate();

  return (
    <div role="status" aria-busy="true" aria-label="Loading schedule" className={cn(adminStyles.calendar, className)}>
      <span className="sr-only">Loading schedule…</span>
      <div aria-hidden="true">
        <DashboardSectionHeaderSkeleton />
        <div className="grid grid-cols-7 gap-1 pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="py-1 flex justify-center"><Skeleton className="h-4 w-7" /></div>
          ))}
        </div>
        <div className={adminStyles.calendarDays}>
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`offset-${i}`} className={`${adminStyles.calendarDay} admin-dashboard-calendar-day-empty`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => (
            <div key={i} className={`${adminStyles.calendarDay} border-border/60`}>
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="mt-0.5 sm:mt-1 min-h-3.5 sm:min-h-4 flex items-center justify-center">
                <Skeleton className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
};

const DashboardSectionHeaderSkeleton = ({ badge = false }: { badge?: boolean }) => (
  <div className={adminStyles.sectionHeader}>
    <div className="min-h-8 flex items-center min-w-0">
      <Skeleton className="h-5 sm:h-6 w-44 max-w-full" />
    </div>
    <Skeleton className={badge ? "h-6 w-16 rounded-md" : "h-8 w-24 rounded-xl"} />
  </div>
);/* ─── Collector Full Dashboard Skeleton ─── */
export const CollectorCalendarCardSkeleton = ({ year, month }: { year?: number; month?: number } = {}) => {
  const now = getManilaNow();
  const displayYear = year ?? now.year;
  const displayMonth = month ?? now.month - 1;
  const leadingDays = new Date(displayYear, displayMonth, 1).getDay();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

  return (
    <section role="status" aria-busy="true" className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs sm:p-4">
      <span className="sr-only">Loading schedule…</span>
      <div aria-hidden="true" className="flex items-center justify-between border-b border-border/60 pb-3 sm:pb-4">
        <div className="flex items-center gap-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-7 w-12 rounded-lg" /></div>
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-7 gap-1 pb-2 pt-3 sm:pt-4">
        {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="mx-auto h-3 w-6 max-w-full" />)}
      </div>
      <div aria-hidden="true" className="grid min-h-0 flex-1 grid-cols-7 gap-1">
        {Array.from({ length: leadingDays + daysInMonth }).map((_, index) => (
          <div key={index} className={cn("flex min-h-[52px] flex-col rounded-xl border p-1 sm:p-2", index < leadingDays ? "border-transparent bg-muted/10" : "border-border/60 bg-muted/20")}>
            {index >= leadingDays && <Skeleton className="h-3 w-4" />}
          </div>
        ))}
      </div>
    </section>
  );
};

export const CollectorDashboardSkeleton = () => (
  <div role="status" aria-busy="true" className="collector-dashboard mx-auto min-w-0 w-full max-w-[1600px] space-y-4 pb-8 sm:space-y-5">
    <span className="sr-only">Loading collector dashboard…</span>
    <div aria-hidden="true" className="collector-dashboard-greeting rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs sm:p-4 md:p-5">
      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-7 w-48 sm:h-8 sm:w-56" /><Skeleton className="h-5 w-20 rounded-lg" /></div>
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0"><Skeleton className="h-7 w-36 rounded-lg sm:h-8" /><Skeleton className="h-7 w-28 rounded-lg sm:h-8" /></div>
      </div>
    </div>

    <AdminKpiSkeleton count={3} />

    <div className="collector-dashboard-workspace">
      <div aria-hidden="true" className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs sm:min-h-[380px] lg:min-h-[355px]">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5"><Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-20 rounded-md" /></div>
        <div className="flex flex-1 flex-col justify-between space-y-4 p-4 sm:p-5">
          <div className="space-y-4">
            <div className="space-y-2"><div className="flex justify-between gap-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-5 w-24 rounded-md" /></div><Skeleton className="h-3 w-48 max-w-full" /></div>
            <div className="flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:p-4"><div className="flex min-w-0 w-full items-center gap-3"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-28 max-w-full" /><Skeleton className="h-4 w-48 max-w-full" /></div></div><Skeleton className="h-7 w-16 shrink-0 rounded-lg" /></div>
            <div className="space-y-2"><Skeleton className="h-3 w-40" /><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-11 rounded-xl" />)}</div></div>
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
      <div className="min-h-[360px] sm:min-h-[380px] lg:min-h-[355px]"><CollectorCalendarCardSkeleton /></div>
    </div>

    <div className="collector-dashboard-support">
      <div aria-hidden="true" className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5"><Skeleton className="h-4 w-44 max-w-[70%]" /><Skeleton className="h-3 w-14" /></div>
        <div className="divide-y divide-border/50">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-32 max-w-full" /></div><Skeleton className="h-5 w-12" /></div>)}</div>
      </div>
      <div aria-hidden="true" className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between border-b border-border/50 pb-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-24 rounded-md" /></div>
        <div className="collector-dashboard-truck-details my-auto py-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-2 sm:p-3"><Skeleton className="h-3 w-16 max-w-full" /><Skeleton className="h-4 w-20 max-w-full" /><Skeleton className="h-3 w-14 max-w-full" /></div>)}</div>
        <div className="collector-dashboard-truck-footer flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-11 w-36 rounded-xl" /></div>
      </div>
    </div>
  </div>
);

/* ─── Collector Schedule Skeletons ─── */
export const CalendarMonthGridSkeleton = ({ currentDate }: { currentDate: Date }) => {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  return (
    <div role="status" aria-busy="true" className="grid min-h-0 grid-cols-7 gap-1 sm:flex-1 sm:auto-rows-fr sm:gap-1.5">
      <span className="sr-only">Loading schedule calendar…</span>
      {Array.from({ length: firstDay + days }).map((_, index) => (
        <div key={index} aria-hidden="true" className={cn("aspect-square min-h-0 rounded-xl border p-1 sm:aspect-auto sm:h-full sm:p-2", index < firstDay ? "border-transparent bg-muted/20 opacity-30" : "border-border/60")}>
          {index >= firstDay && <><Skeleton className="size-5 rounded-full" /><div className="mt-0.5 min-h-3.5 sm:mt-1 sm:min-h-4" /></>}
        </div>
      ))}
    </div>
  );
};

export const SelectedDayEventsSkeleton = () => (
  <div role="status" aria-busy="true" className="space-y-3">
    <span className="sr-only">Loading schedule events…</span>
    {Array.from({ length: 2 }).map((_, index) => (
      <div key={index} aria-hidden="true" className="space-y-2.5 rounded-xl border border-border/80 bg-background p-3.5 shadow-2xs">
        <div className="flex items-center gap-2"><Skeleton className="size-2.5 shrink-0 rounded-full" /><Skeleton className="h-4 w-36 max-w-full" /></div>
        <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" />
        <div className="border-t border-border/40 pt-2"><Skeleton className="h-3 w-40 max-w-full" /></div>
      </div>
    ))}
  </div>
);

export const CollectorScheduleSkeleton = ({ currentDate }: { currentDate: Date }) => (
  <AdminScheduleSkeleton currentDate={currentDate} variant="collector" />
);

/* ─── Collector Route History Skeletons ─── */
export const CollectorRouteHistoryRowsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div role="status" aria-busy="true" className="flex flex-col gap-3">
    <span className="sr-only">Loading route history…</span>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} aria-hidden="true" className="collector-history-card w-full rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="collector-history-ring flex size-12 shrink-0 items-center justify-center rounded-full border-[4px] border-muted"><Skeleton className="h-2.5 w-5" /></div>
        <div className="collector-history-heading"><Skeleton className="h-5 w-36 max-w-full" /></div>
        <div className="collector-history-badges"><Skeleton className="h-[26px] w-24 max-w-full rounded-lg" /><Skeleton className="h-[26px] w-32 max-w-full rounded-lg" /></div>
        <div className="collector-history-metadata">
          {["w-44", "w-40", "w-24", "w-16"].map((width) => <Skeleton key={width} className={cn("h-4 max-w-full sm:h-5", width)} />)}
        </div>
        <Skeleton className="collector-history-arrow size-8 shrink-0 rounded-xl sm:size-9" />
      </div>
    ))}
  </div>
);

export const CollectorRouteHistorySkeleton = () => (
  <div role="status" aria-busy="true" className="resident-page collector-history-page mx-auto flex w-full max-w-[1200px] flex-col gap-4 pb-8 sm:gap-5">
    <span className="sr-only">Loading route history…</span>
    <ResidentPageHeaderSkeleton className="admin-module-header" title="Route History" description="Review previous collection shifts, stops, and route results." />
    <div aria-hidden="true" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-1.5 overflow-hidden">{[92, 100, 70, 118].map((width) => <Skeleton key={width} className="h-9 shrink-0 rounded-lg" style={{ width }} />)}</div>
      <Skeleton className="h-9 w-full shrink-0 rounded-lg sm:w-[190px]" />
    </div>
    <CollectorRouteHistoryRowsSkeleton />
  </div>
);

export const CollectorRouteHistoryDetailSkeleton = ({ onBack }: { onBack?: () => void } = {}) => (
  <div role="status" aria-busy="true" className="resident-page collector-history-page collector-history-detail mx-auto flex w-full max-w-[1200px] flex-col gap-4 pb-8 sm:gap-5">
    <span className="sr-only">Loading route details…</span>
    {onBack ? <BackButton onBack={onBack} label="Back to Route History" className="mb-0 h-11 w-fit sm:h-9" /> : <Skeleton aria-hidden="true" className="h-11 w-20 sm:h-9" />}
    <div aria-hidden="true" className="collector-history-summary rounded-2xl border border-border/80 bg-card shadow-xs">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-[30px] w-80 max-w-full sm:h-[37.5px]" />
          <Skeleton className="collector-history-detail-title-line h-[30px] w-48 max-w-full" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2"><Skeleton className="h-[26px] w-24 rounded-lg" /><Skeleton className="h-[26px] w-32 max-w-full rounded-lg" /></div>
      <div className="collector-history-summary-meta border-t border-border/60 pt-4">
        {Array.from({ length: 2 }, (_, index) => <div key={index} className="flex min-w-0 items-start gap-2.5"><Skeleton className="mt-0.5 size-4 shrink-0" /><div className="min-w-0 flex-1 space-y-1"><Skeleton className="h-[18px] w-24 max-w-full" /><Skeleton className="h-5 w-60 max-w-full" /></div></div>)}
      </div>
    </div>
    <div aria-hidden="true" className="collector-history-checkpoints rounded-2xl border border-border/80 bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5"><div className="flex items-center gap-2"><Skeleton className="size-4" /><Skeleton className="h-5 w-36 max-w-full" /></div><Skeleton className="h-[26px] w-24 rounded-lg" /></div>
      <div className="collector-history-stop-list">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="collector-history-stop rounded-xl border border-border/80 bg-card">
            <Skeleton className="collector-history-stop-number size-9 shrink-0 rounded-lg" />
            <div className="collector-history-stop-title space-y-1"><Skeleton className="h-5 w-60 max-w-full" /><Skeleton className="collector-history-detail-title-line h-5 w-40 max-w-full" /></div>
            <div className="collector-history-stop-meta"><Skeleton className="h-[26px] w-24 max-w-full rounded-lg" /><Skeleton className="h-[18px] w-20 max-w-full" /></div>
            {index === 1 && <div className="collector-history-stop-reason min-w-0 space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3"><Skeleton className="h-[18px] w-24 max-w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /></div>}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Collector Profile Skeleton ─── */
export const CollectorProfileSkeleton = () => (
  <div role="status" aria-busy="true" className={collectorProfile.page}>
    <span className="sr-only">Loading collector profile…</span>
    <ResidentPageHeaderSkeleton title="Profile & Account" description="Manage your personal details and account security." />
    <div aria-hidden="true" className={cn(collectorProfile.stack, "pointer-events-none")}>
      <div className={collectorProfile.hero}>
        <div className={collectorProfile.cover}><Skeleton className="absolute inset-0 h-full w-full rounded-none" /></div>
        <div className={collectorProfile.identity}>
          <div className={collectorProfile.identityRow}>
            <div className="relative shrink-0">
              <Skeleton className={collectorProfile.avatar} />
              <div className={collectorProfile.avatarAction}><Skeleton className="h-full w-full rounded-full" /></div>
            </div>
            <div className={collectorProfile.identityDetails}>
              <div className={collectorProfile.nameRow}>
                <Skeleton className={`${collectorProfile.name} h-[1.3em] w-32 max-w-full`} />
                <Skeleton className="h-6 w-28 max-w-full rounded-md" />
              </div>
              <div className={collectorProfile.metadata}><Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-4 w-32 max-w-full" /></div>
            </div>
          </div>
        </div>
      </div>

      <section className={collectorProfile.section}>
        <div className={collectorProfile.vehicleHeader}>
          <div className={collectorProfile.vehicleHeading}>
            <Skeleton className={collectorProfile.sectionIcon} />
            <div className="min-w-0">
              <Skeleton className="gw-heading w-fit max-w-full text-sm tracking-tight"><span className="invisible">Assigned Vehicle & Equipment</span></Skeleton>
              <Skeleton className="mt-0.5 w-fit max-w-full text-xs leading-relaxed"><span className="invisible">Current truck assignment and operational truck status</span></Skeleton>
            </div>
          </div>
          <Skeleton className="h-6 w-32 max-w-full shrink-0 rounded-lg" />
        </div>
        <div className="space-y-3.5">
          <div className={collectorProfile.vehicleGrid}>
            {Array.from({ length: 2 }).map((_, index) => <div key={index} className={collectorProfile.vehicleCard}><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-6 w-28 max-w-full" /></div>)}
          </div>
          <div className={collectorProfile.vehicleFooter}><Skeleton className="min-w-0 max-w-full text-xs leading-relaxed"><span className="invisible">Assigned by MENRO Candelaria Truck Operations</span></Skeleton><Skeleton className={`${collectorProfile.vehicleAction} min-w-40`} /></div>
        </div>
      </section>

      <section className={collectorProfile.section}>
        <div className={collectorProfile.sectionHeader}>
          <Skeleton className={collectorProfile.sectionIcon} />
          <div className="min-w-0">
            <Skeleton className="gw-heading w-fit max-w-full text-sm tracking-tight"><span className="invisible">Personal Information</span></Skeleton>
            <Skeleton className="mt-0.5 w-fit max-w-full text-xs leading-relaxed"><span className="invisible">Manage your profile details and security credentials</span></Skeleton>
          </div>
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={collectorProfile.row}>
              <div className={collectorProfile.rowContent}>
                <Skeleton className={collectorProfile.rowIcon} />
                <div className="min-w-0 flex-1"><Skeleton className={`${collectorProfile.label} h-[1.5em] w-24 max-w-full`} /><Skeleton className={`${collectorProfile.value} h-[1.5em] w-40 max-w-full`} /></div>
              </div>
              {index === 2 ? <div className={collectorProfile.registeredEmail}><Skeleton className="size-3.5 shrink-0" /><Skeleton className="admin-profile-email-label h-4 w-24 max-w-full" /></div>
                : <div className={`${collectorProfile.fieldAction} flex items-center`}><Skeleton className={index === 4 ? "h-4 w-11" : "h-4 w-6"} /></div>}
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <div className={collectorProfile.logout}><div className="flex min-w-0 items-center gap-3"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0"><Skeleton className="h-5 w-16 max-w-full" /><Skeleton className="h-4 w-36 max-w-full" /></div></div><Skeleton className="size-4 shrink-0" /></div>
        <div className={collectorProfile.privacy}><Skeleton className="mt-0.5 size-3.5 shrink-0" /><Skeleton className="h-8 w-full max-w-sm" /></div>
      </div>
    </div>
  </div>
);

/* ─── Collector Route Map Skeleton ─── */
export const CollectorRouteMapSkeleton = () => (
  <div role="status" aria-busy="true" className="resident-page collector-route-page mx-auto min-w-0 w-full max-w-[1600px] space-y-4 pb-6 sm:space-y-5">
    <span className="sr-only">Loading collection route…</span>
    <ResidentPageHeaderSkeleton className="admin-module-header" titleClassName="w-64" descriptionClassName="w-80" />

    <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-xs sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-6 w-28 rounded-lg" /><Skeleton className="h-6 w-20 rounded-lg" /></div>
      <Skeleton className="h-7 w-28 rounded-lg" />
    </div>

    <div aria-hidden="true" className="collector-route-start-card flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-2"><Skeleton className="h-5 w-52 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /><Skeleton className="h-4 w-48 max-w-full" /></div>
      </div>
      <Skeleton className="h-12 w-full shrink-0 rounded-xl sm:w-48" />
    </div>

    <div className="collector-route-workspace">
      <section aria-label="Loading planned route map" className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="space-y-1.5"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-52 max-w-full" /></div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <div aria-hidden="true" className="collector-route-map-height relative bg-muted/25">
          <div className="absolute right-3 top-3 rounded-xl border border-border/70 bg-card p-0.5">
            <Skeleton className="size-11 rounded-lg" /><Skeleton className="mt-1 size-11 rounded-lg" />
          </div>
          <Skeleton className="absolute bottom-3 right-3 size-11 rounded-xl" />
        </div>
      </section>
      <section aria-label="Loading assigned stop order" className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
        <div aria-hidden="true" className="mb-3 flex items-center justify-between gap-3"><div className="space-y-1.5"><Skeleton className="h-5 w-24" /><Skeleton className="h-3 w-52 max-w-full" /></div><Skeleton className="h-7 w-8 rounded-lg" /></div>
        <div aria-hidden="true" className="divide-y divide-border/60">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"><Skeleton className="size-8 shrink-0 rounded-lg" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-36 max-w-full" />{index === 0 && <Skeleton className="h-3 w-16" />}</div></div>)}
        </div>
      </section>
    </div>
  </div>
);

/* ─── Dashboard Header Skeleton ─── */
export const DashboardHeaderSkeleton = () => (
  <div className={adminStyles.header}>
    <div className={adminStyles.headerRow}>
      <div className="min-w-0">
        <Skeleton className={`${adminStyles.title} h-[1.25em] w-72 max-w-full`} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
      </div>
      <div className={adminStyles.headerActions}>
        <Skeleton className={`${adminStyles.headerAction} w-36 rounded-lg`} />
        <Skeleton className={`${adminStyles.headerAction} w-24 rounded-lg`} />
      </div>
    </div>
  </div>
);

/* ─── Profile Page Skeleton (Resident) ─── */
const ProfileSectionHeaderSkeleton = ({ action = false }: { action?: boolean }) => (
  <div className={profileStyles.sectionHeader}>
    <div className={profileStyles.sectionHeading}>
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
    </div>
    {action && <Skeleton className="h-8 w-24 max-w-full rounded-lg" />}
  </div>
);

export const ProfileSkeleton = () => (
  <div role="status" aria-busy="true" aria-label="Loading resident profile" className={profileStyles.page}>
    <div aria-hidden="true">
      <ResidentPageHeaderSkeleton />
      <div className={profileStyles.stack}>
        <div className={profileStyles.hero}>
          <div className={profileStyles.cover}><Skeleton className="h-full w-full rounded-none" /></div>
          <div className={profileStyles.identity}>
            <div className={profileStyles.identityRow}>
              <div className={`${profileStyles.avatar} relative shrink-0 rounded-full border border-border/50 bg-card ring-[3px] ring-card`}>
                <Skeleton className="h-full w-full rounded-full" />
                <div className="absolute -bottom-1 -right-1 size-7 overflow-hidden rounded-full border border-border/80 bg-card">
                  <Skeleton className="h-full w-full rounded-full" />
                </div>
              </div>
              <div className={profileStyles.identityDetails}>
                <div className={profileStyles.nameRow}>
                  <Skeleton className={`${profileStyles.name} h-[1.25em] w-48 max-w-full`} />
                  <Skeleton className="h-6 w-28 max-w-full rounded-md" />
                </div>
                <div className={profileStyles.identityMeta}>
                  <Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-4 w-32 max-w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={profileStyles.body}>
          <section className={profileStyles.personal}>
            <ProfileSectionHeaderSkeleton />
            <div className="divide-y divide-border/50">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={profileStyles.fieldRow}>
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24 max-w-full" />
                      <Skeleton className="h-5 w-40 max-w-full" />
                    </div>
                  </div>
                  <Skeleton className={index === 2 ? "h-8 w-4 shrink-0" : "h-8 w-12 shrink-0 rounded-lg"} />
                </div>
              ))}
            </div>
          </section>
          <section className={profileStyles.panel}>
            <ProfileSectionHeaderSkeleton action />
            <div className={profileStyles.resolution}>
              <div className="flex min-w-0 flex-wrap justify-between gap-2">
                <Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" />
            </div>
            <div className={profileStyles.stats}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={profileStyles.stat}>
                  <Skeleton className="mx-auto h-8 w-12 max-w-full" />
                  <Skeleton className="mx-auto h-3 w-16 max-w-full" />
                </div>
              ))}
            </div>
          </section>
          <section className={profileStyles.panel}>
            <ProfileSectionHeaderSkeleton action />
            <div className={profileStyles.badges}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={`${profileStyles.badge} border-border/60`}>
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Skeleton className="h-4 w-24 max-w-full" /><Skeleton className="h-4 w-12 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className={profileStyles.hero}>
          <div className="flex min-w-0 items-center justify-between gap-3 p-4">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-52 max-w-full" /></div>
            <Skeleton className="size-4 shrink-0 rounded-md" />
          </div>
        </div>
        <Skeleton className="mx-auto h-3 w-80 max-w-full" />
      </div>
    </div>
  </div>
);

/* ─── Admin Profile Skeleton ─── */
export const AdminProfileSkeleton = () => (
  <div role="status" aria-busy="true" aria-label="Loading administrator profile" className={adminProfile.page}>
    <span className="sr-only">Loading administrator profile…</span>
    <ResidentPageHeaderSkeleton title="Profile & Account" description="Manage your personal details and account security." />
    <div aria-hidden="true" className={cn(adminProfile.stack, "pointer-events-none")}>
      <div className={adminProfile.hero}>
        <div className={adminProfile.cover}><Skeleton className="absolute inset-0 h-full w-full rounded-none" /></div>
        <div className={adminProfile.identity}>
          <div className={adminProfile.identityRow}>
            <div className="relative shrink-0">
              <Skeleton className={adminProfile.avatar} />
              <div className={adminProfile.avatarAction}><Skeleton className="h-full w-full rounded-full" /></div>
            </div>
            <div className={adminProfile.identityDetails}>
              <div className={adminProfile.nameRow}>
                <Skeleton className={`${adminProfile.name} h-[1.3em] w-48 max-w-full`} />
                <Skeleton className="h-6 w-28 max-w-full rounded-md" />
              </div>
              <div className={adminProfile.metadata}><Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-4 w-32 max-w-full" /></div>
            </div>
          </div>
        </div>
      </div>

      <section className={adminProfile.section}>
        <div className={adminProfile.sectionHeader}>
          <Skeleton className={adminProfile.sectionIcon} />
          <div className="min-w-0 space-y-1"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-4 w-64 max-w-full" /></div>
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={adminProfile.row}>
              <div className={adminProfile.rowContent}>
                <Skeleton className={adminProfile.rowIcon} />
                <div className="min-w-0 flex-1"><Skeleton className={`${adminProfile.label} h-[1.5em] w-24 max-w-full`} /><Skeleton className={`${adminProfile.value} h-[1.5em] w-40 max-w-full`} /></div>
              </div>
              {i === 2 ? <div className={adminProfile.registeredEmail}><Skeleton className="size-3.5 shrink-0" /><Skeleton className="admin-profile-email-label h-4 w-24 max-w-full" /></div>
                : <div className={`${adminProfile.fieldAction} flex items-center`}><Skeleton className={i === 4 ? "h-4 w-11" : "h-4 w-6"} /></div>}
            </div>
          ))}
        </div>
      </section>

      <section className={adminProfile.section}>
        <div className={adminProfile.sectionHeader}>
          <Skeleton className={adminProfile.sectionIcon} />
          <div className="min-w-0 space-y-1"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-4 w-56 max-w-full" /></div>
        </div>
        <div className={adminProfile.overview}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className={adminProfile.overviewCard}><Skeleton className="mb-2 size-4 rounded" /><Skeleton className={`${adminProfile.overviewLabel} h-[1.5em] w-20 max-w-full`} /><Skeleton className="mt-1 h-5 w-28 max-w-full" /></div>)}
        </div>
      </section>

      <div className={adminProfile.logout}><div className="flex min-w-0 items-center gap-3"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0"><Skeleton className="h-5 w-16 max-w-full" /><Skeleton className="h-4 w-36 max-w-full" /></div></div><Skeleton className="size-4 shrink-0" /></div>
    </div>
  </div>
);

/* ─── Resident Settings Page Skeleton (1:1 with ResidentSettings.tsx) ─── */
export const SettingsSkeleton = () => (
  <div role="status" aria-busy="true" aria-label="Loading resident settings" className={settingsStyles.page}>
    <ResidentPageHeaderSkeleton titleClassName="w-36" descriptionClassName="w-96" />
    {[1, 3, 0, 2, 2].map((rowCount, sectionIndex) => (
      <section key={sectionIndex} aria-hidden="true" className={settingsStyles.section}>
        <div className={settingsStyles.sectionHeader}>
          <Skeleton className={settingsStyles.icon} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
        {sectionIndex === 2 ? (
          <div className="space-y-2">
            <div className={settingsStyles.themeHeading}><Skeleton className="h-4 w-24 max-w-full" /><Skeleton className="h-3 w-28 max-w-full" /></div>
            <div className={settingsStyles.themeGrid}><Skeleton className={settingsStyles.themeSkeleton} /><Skeleton className={settingsStyles.themeSkeleton} /></div>
          </div>
        ) : (
          <div className="space-y-1">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div key={rowIndex} className={settingsStyles.row}>
                <div className={settingsStyles.rowContent}>
                  <Skeleton className={settingsStyles.icon} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                    <Skeleton className="resident-settings-skeleton-second-line h-3 w-4/5 max-w-full" />
                  </div>
                </div>
                <Skeleton className={sectionIndex <= 1 ? "h-6 w-11 shrink-0 rounded-full" : "size-4 shrink-0 rounded-md"} />
              </div>
            ))}
          </div>
        )}
      </section>
    ))}
    <div className={settingsStyles.footer} aria-hidden="true"><Skeleton className="mx-auto h-3 w-80 max-w-full" /></div>
  </div>
);

/* ─── Admin Settings Skeleton ─── */
const AdminSettingsTextSkeleton = ({ className, children }: { className: string; children: ReactNode }) => (
  <Skeleton aria-hidden="true" className={`admin-settings-skeleton-text w-fit max-w-full ${className}`}>
    <span className="invisible">{children}</span>
  </Skeleton>
);

export const AdminSettingsSkeleton = () => (
  <div role="status" aria-busy="true" aria-label="Loading admin settings…" className={adminSettingsStyles.page}>
    <ResidentPageHeaderSkeleton className="admin-module-header" title={adminSettingsCopy.title} description={adminSettingsCopy.description} />
    {[
      { title: adminSettingsCopy.notificationsTitle, description: adminSettingsCopy.notificationsDescription, alerts: true },
      { title: adminSettingsCopy.displayTitle, description: adminSettingsCopy.displayDescription, alerts: false },
    ].map(({ title, description, alerts }) => (
      <section key={title} className={adminSettingsStyles.section} aria-hidden="true">
        <div className={adminSettingsStyles.sectionHeader}>
          <Skeleton className={`${adminSettingsStyles.icon} border-transparent`} />
          <div className="min-w-0 flex-1">
            <AdminSettingsTextSkeleton className={adminSettingsStyles.sectionTitle}>{title}</AdminSettingsTextSkeleton>
            <AdminSettingsTextSkeleton className={adminSettingsStyles.sectionDescription}>{description}</AdminSettingsTextSkeleton>
          </div>
        </div>
        {alerts ? (
          <>
            <div className="space-y-1">
              {adminAlertOptions.map(({ key, label, description: alertDescription }) => (
                <div key={key} className={adminSettingsStyles.row}>
                  <div className={adminSettingsStyles.rowContent}>
                    <Skeleton className={`${adminSettingsStyles.icon} border-transparent`} />
                    <div className="min-w-0 flex-1">
                      <AdminSettingsTextSkeleton className={adminSettingsStyles.label}>{label}</AdminSettingsTextSkeleton>
                      <AdminSettingsTextSkeleton className={adminSettingsStyles.rowDescription}>{alertDescription}</AdminSettingsTextSkeleton>
                    </div>
                  </div>
                  <Skeleton className="h-6 w-11 shrink-0 rounded-md" />
                </div>
              ))}
            </div>
            <div className={adminSettingsStyles.footer}>
              <AdminSettingsTextSkeleton className={adminSettingsStyles.footerText}>{adminSettingsCopy.saved}</AdminSettingsTextSkeleton>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <AdminSettingsTextSkeleton className={`${adminSettingsStyles.label} tracking-tight`}>{adminSettingsCopy.theme}</AdminSettingsTextSkeleton>
            <div className={adminSettingsStyles.themeGrid}>
              {["Light", "Dark"].map((mode) => (
                <div key={mode} className={`${adminSettingsStyles.themeButton} border-transparent`}>
                  <Skeleton className="size-4 shrink-0" />
                  <AdminSettingsTextSkeleton className="admin-settings-theme-long">{mode} Mode</AdminSettingsTextSkeleton>
                  <AdminSettingsTextSkeleton className="admin-settings-theme-short">{mode}</AdminSettingsTextSkeleton>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    ))}
  </div>
);

/* ─── Admin Schedule Manager Skeleton ─── */
export const AdminScheduleSkeleton = ({ currentDate, variant = "admin" }: { currentDate: Date; variant?: "admin" | "collector" }) => {
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  return (
    <div role="status" aria-busy="true" className="resident-page admin-community admin-schedule mx-auto min-w-0 w-full max-w-[1600px] pb-10">
      <span className="sr-only">{variant === "collector" ? "Loading schedule…" : "Loading internal schedules…"}</span>
      <div aria-hidden="true" className="space-y-4 sm:space-y-6">
        <ResidentPageHeaderSkeleton className="admin-module-header" title={variant === "collector" ? "MENRO Calendar" : "Schedule Management"} description={variant === "collector" ? "View MENRO events scheduled for this month." : "Plan MENRO activities. Manage resident collection days in Route Manager."}
        actionsClassName="admin-module-header-actions"
        actions={variant === "admin" ? <Skeleton className={`${postStyles.action} flex items-center`}><span className="size-3.5 shrink-0" /><span className="invisible">New Internal Schedule</span></Skeleton> : undefined} />

        {variant === "admin" && <AdminKpiSkeleton />}

        <div className={scheduleStyles.workspace}>
          <div className={scheduleStyles.workspaceHeader}>
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-5 w-32 max-w-full" />
                <Skeleton className="h-4 w-52 max-w-full" />
              </div>
            </div>
            {variant === "admin" && <div className={scheduleStyles.toolbar}>
              <Skeleton className={`${scheduleStyles.search} h-11 md:h-9 rounded-xl`} />
            </div>}
          </div>

        <div className={`${scheduleStyles.layout} p-3 sm:p-5`}>
          <div className={`${scheduleStyles.calendar} rounded-2xl border border-border/80 bg-card shadow-2xs flex flex-col`}>
            <div className="calendar-grid-header mb-3 flex shrink-0 items-center justify-between border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
              <div className="calendar-grid-heading flex items-center gap-2 sm:gap-2.5">
                <Skeleton className="calendar-grid-heading-label h-6 w-44 max-w-full" />
                <Skeleton className="h-8 w-14 rounded-lg" />
              </div>
              <div className="calendar-grid-navigation flex gap-1"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
            </div>
            <div className="grid shrink-0 grid-cols-7 gap-1 pb-2 text-center">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="mx-auto my-1 h-4 w-7 max-w-full" />)}
            </div>
            <div className="calendar-grid-cells grid min-h-0 grid-cols-7 gap-1 sm:flex-1 sm:auto-rows-fr sm:gap-1.5">
              {Array.from({ length: firstDayIndex + daysInMonth }).map((_, i) => (
                i < firstDayIndex ? (
                  <div key={i} className="calendar-grid-day aspect-square rounded-xl border border-transparent bg-muted/20 opacity-30 sm:aspect-auto sm:h-full" />
                ) : (
                  <div key={i} className="calendar-grid-day calendar-grid-day-placeholder flex aspect-square flex-col justify-between rounded-xl border border-border/60 p-1 sm:aspect-auto sm:h-full sm:p-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="mx-auto h-2 w-2 rounded-full" />
                  </div>
                )
              ))}
            </div>
          </div>

          <aside className={`${scheduleStyles.dayPanel} flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs`}>
            <div className="mb-3.5 flex shrink-0 items-center gap-3 border-b border-border/60 pb-3.5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-36 max-w-full" />
                <Skeleton className="h-4 w-44 max-w-full" />
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-hidden pr-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2.5 rounded-xl border border-l-[3px] border-border/80 bg-muted/40 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2"><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-7 w-7 rounded-lg" /></div>
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-40 max-w-full" /></div>
                  <div className="space-y-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                  <div className="border-t border-border/40 pt-2"><Skeleton className="h-3 w-24" /></div>
                </div>
              ))}
            </div>
          </aside>
        </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Shared resident, collector, and admin notification feed ─── */
const NotificationFeedSkeleton = ({ role }: { role: "resident" | "admin" | "collector" }) => (
  <div role="status" aria-label="Loading Notifications" className={notificationStyles.page}>
    <ResidentPageHeaderSkeleton
      title={role !== "resident" ? "Notifications" : undefined}
      description={role === "admin" ? "Resident reports, collection updates, and driver messages." : role === "collector" ? "Route alerts, dispatch messages, and announcements." : undefined}
      titleBadge={<Skeleton className="h-5 w-16 rounded-md" />}
      actionsClassName={notificationStyles.headerActions}
      actions={<>
        <Skeleton className="h-9 w-32 rounded-lg" /><Skeleton className="h-9 w-20 rounded-lg" />
      </>}
    />
    <div className="space-y-4">
      <div className={notificationStyles.filterRow}>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
          {(role === "collector" ? [44, 110, 112, 114] : role === "admin" ? [44, 94, 76, 78, 114] : [44, 88, 74, 78, 114]).map((width) => <Skeleton key={width} className="h-9 shrink-0 rounded-lg" style={{ width }} />)}
        </div>
        <Skeleton className={notificationStyles.menuTrigger} />
      </div>
      <NotificationsListSkeleton />
    </div>
  </div>
);

export const NotificationsListSkeleton = () => (
  <div role="status" aria-label="Loading notifications" className={notificationStyles.list}>
    {Array.from({ length: 15 }).map((_, i) => (
      <div key={i} aria-hidden="true" className={notificationStyles.skeletonRow}>
        <Skeleton className={notificationStyles.icon} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className={cn("h-4 max-w-full", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
          <Skeleton className="h-3 w-4/5 max-w-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className={notificationStyles.trailing}><Skeleton className="size-3.5 rounded-md" /></div>
      </div>
    ))}
  </div>
);

export const NotificationsPageSkeleton = ({ role = "resident" }: { role?: "resident" | "collector" | "admin" }) => <NotificationFeedSkeleton role={role} />;

/* ─── Resident Schedule Page Skeleton (1:1 with ResidentSchedule.tsx) ─── */
export const ResidentScheduleSkeleton = () => (
  <div role="status" aria-label="Loading resident calendar" className={`${residentPageStyles.page} max-w-[1400px] space-y-4 pb-8 md:space-y-5 md:pb-10 lg:pb-12`}>
    <ResidentPageHeaderSkeleton
      className="resident-page-header-wide"
      titleClassName="w-60"
      actionsClassName="resident-page-header-wide-actions"
      actions={<div className="resident-page-header-tabs gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-1">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>}
    />

    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between gap-3"><Skeleton className="h-6 w-40 max-w-full" /><div className="flex gap-2"><Skeleton className="size-8 rounded-lg" /><Skeleton className="size-8 rounded-lg" /></div></div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="mx-auto h-3 w-6 max-w-full" />)}</div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">{Array.from({ length: 35 }).map((_, i) => <div key={i} className="aspect-square rounded-xl border border-border/60 p-1.5 sm:aspect-auto sm:min-h-20 sm:p-2"><Skeleton className="size-5 rounded-full" /></div>)}</div>
          <div className="flex items-center gap-2 border-t border-border/60 pt-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-6 w-36 rounded-lg" /></div>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs lg:col-span-1">
        <div className="space-y-2 border-b border-border/60 p-4 lg:p-5"><Skeleton className="h-5 w-48 max-w-full" /><Skeleton className="h-3 w-44 max-w-full" /></div>
        <div className="space-y-4 p-4 lg:p-5">
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4"><div className="flex justify-between gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-24 rounded-md" /></div><Skeleton className="h-4 w-40" /><div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-28" /></div></div>
          <div className="space-y-2.5"><Skeleton className="h-4 w-32" /><div className="space-y-2 rounded-xl border border-dashed border-border/80 p-4"><Skeleton className="mx-auto size-5 rounded-lg" /><Skeleton className="mx-auto h-4 w-32" /><Skeleton className="mx-auto h-3 w-48 max-w-full" /></div></div>
          <div className="border-t border-border/60 pt-2"><Skeleton className="h-9 w-full rounded-xl" /></div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Resident My Reports skeletons ─── */
// Match the ten-report page size for both initial and filtered list loading.
export const MyReportsListSkeleton = ({ count = 10 }: { count?: number }) => (
  <div role="status" aria-label="Loading reports" className={myReportsStyles.list}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className={myReportsStyles.skeletonCard}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Skeleton className={myReportsStyles.icon} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-28 max-w-full" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-4 shrink-0" />
        </div>
        <Skeleton className={cn(myReportsStyles.preview, "h-4 w-4/5")} />
        <div className={myReportsStyles.footer}>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="my-reports-photo-count h-3 w-16" />
        </div>
      </div>
    ))}
  </div>
);

export const MyReportsPageSkeleton = () => (
  <div role="status" aria-label="Loading My Reports" className={myReportsStyles.page}>
    <ResidentPageHeaderSkeleton
      actionsClassName={myReportsStyles.headerActions}
      actions={<Skeleton className="h-9 w-32 rounded-lg" />}
    />
    <div className="space-y-4">
    <div className="space-y-3">
      <Skeleton className="h-11 w-full rounded-lg md:h-10" />
      <div className={myReportsStyles.filterRow}>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {["w-16", "w-24", "w-32", "w-24", "w-20"].map((width, index) => (
            <Skeleton key={index} className={cn("h-9 shrink-0 rounded-xl", width)} />
          ))}
        </div>
        <div className={myReportsStyles.sort}><Skeleton className="h-9 w-full rounded-lg" /></div>
      </div>
    </div>
    <MyReportsListSkeleton />
    </div>
  </div>
);

type MyReportDetailSkeletonPreview = {
  photoCount?: number;
  status?: string;
  statusHistory?: unknown[];
  adminResponse?: string;
  description?: string;
};

export const MyReportDetailSkeleton = ({ preview, onBack }: { preview?: MyReportDetailSkeletonPreview; onBack?: () => void }) => {
  const photoCount = Math.min(Math.max(preview?.photoCount ?? 5, 0), 5);
  const milestoneCount = Math.min(Math.max(preview?.statusHistory?.length ?? 1, 0), 4);
  const descriptionLines = preview?.description
    ? Math.min(Math.max(Math.ceil(preview.description.length / 75), 1), 3)
    : 2;
  const showAction = !preview || preview.status === "submitted" || preview.status === "resolved";

  return (
    <div role="status" aria-busy="true" aria-label="Loading report details" className={reportDetailStyles.page}>
      {onBack && <div className="pb-3 md:pb-0"><BackButton onBack={onBack} label="Back to My Reports" className="mb-0" /></div>}
      <div aria-hidden="true" className={reportDetailStyles.card}>
        <div className={reportDetailStyles.headerSection}>
          <div className={reportDetailStyles.header}>
            <div className={reportDetailStyles.referenceGroup}>
              <div className="text-ui-caption"><Skeleton className="h-[1lh] w-32 max-w-full" /></div>
              <div className={reportDetailStyles.referenceRow}>
                <Skeleton className={`${reportDetailStyles.reference} h-[1.5em] w-40 max-w-full`} />
                <Skeleton className="size-8 shrink-0 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 shrink-0 rounded-md lg:h-7" />
          </div>
          <div className={reportDetailStyles.submitted}><Skeleton className="h-4 w-72 max-w-full" /></div>
        </div>
        <div className={reportDetailStyles.section}>
          <div className={reportDetailStyles.summary}>
            {["Violation Type", "Reported Location"].map((label) => (
              <div key={label} className="min-w-0 space-y-1.5">
                <div className="text-ui-caption"><Skeleton className={cn("h-[1lh] max-w-full", label === "Violation Type" ? "w-28" : "w-36")} /></div>
                <div className={reportDetailStyles.summaryCard}>
                  <Skeleton className={reportDetailStyles.summaryIcon} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="min-w-0 space-y-1.5 pt-1.5 md:pt-2">
            <div className="text-ui-caption"><Skeleton className="h-[1lh] w-40 max-w-full" /></div>
            <div className={`${reportDetailStyles.description} space-y-2`}>
              {Array.from({ length: descriptionLines }).map((_, index) => (
                <Skeleton key={index} className={cn("h-4", index === descriptionLines - 1 ? "w-5/6" : "w-full")} />
              ))}
            </div>
          </div>
        </div>
        {photoCount > 0 && (
          <div className={reportDetailStyles.photosSection}>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-ui-caption"><Skeleton className="h-[1lh] w-28 max-w-full" /></div>
              <Skeleton className="h-3 w-20 shrink-0" />
            </div>
            <div className={reportDetailStyles.photos}>
              {Array.from({ length: photoCount }).map((_, index) => <Skeleton key={index} className={reportDetailStyles.photo} />)}
            </div>
          </div>
        )}
        <div className={reportDetailStyles.progressSection}>
          <div>
            <div className="text-ui-caption"><Skeleton className="h-[1lh] w-52 max-w-full" /></div>
            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-2 min-w-0 flex-1 rounded-full" />)}
              </div>
              <div className={`${reportDetailStyles.progressLabels} text-ui-overline text-muted-foreground md:text-xs`}>
                {["w-14", "w-20", "w-16", "w-12"].map((width) => (
                  <span key={width}><Skeleton className={cn("mx-auto h-[1lh] max-w-full", width)} /></span>
                ))}
              </div>
            </div>
          </div>
          {milestoneCount > 0 && (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="text-ui-caption"><Skeleton className="h-[1lh] w-36 max-w-full" /></div>
              <div className="pl-1">
                {Array.from({ length: milestoneCount }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Skeleton className="mt-1.5 size-2.5 shrink-0 rounded-full" />
                    <div className={`${reportDetailStyles.milestone} flex-1 space-y-1.5`}>
                      <Skeleton className="h-3 w-36 max-w-full" /><Skeleton className="h-3 w-24 max-w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {preview?.adminResponse && (
          <div className={reportDetailStyles.responseSection}>
            <div className="text-ui-caption"><Skeleton className="h-[1lh] w-48 max-w-full" /></div>
            <div className={`${reportDetailStyles.response} space-y-2`}><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
          </div>
        )}
      </div>
      {showAction && (
        <div aria-hidden="true" className={reportDetailStyles.actions}>
          <div className={reportDetailStyles.action}>
            <Skeleton className={reportDetailStyles.actionIcon} />
            <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div>
            <Skeleton className="size-4 shrink-0 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Admin Community Posts Skeletons ─── */
export const AdminPostsSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true" className="resident-page admin-community mx-auto min-w-0 w-full max-w-[1600px] pb-10">
    <span className="sr-only">Loading community posts…</span>
    <div aria-hidden="true" className="space-y-4 sm:space-y-6">
      <ResidentPageHeaderSkeleton className="admin-module-header" title="Community Posts" description="Publish and manage community waste tips, guidelines, and event updates."
        actionsClassName="admin-module-header-actions"
        actions={<Skeleton className={`${postStyles.action} flex items-center`}><span className="size-3.5 shrink-0" /><span className="invisible">Create Post</span></Skeleton>} />
      <AdminKpiSkeleton />
      <section className={`${postStyles.toolbar} admin-toolbar`}>
        <div className={`${postStyles.primary} admin-toolbar-primary`}>
          <div className={`${postStyles.tabs} admin-toolbar-chips flex items-center gap-1.5 overflow-hidden pb-1 sm:pb-0`}>
            {["All Posts", "Published", "Drafts", "Scheduled", "Archived"].map((label) => (
              <Skeleton key={label} className="admin-community-tab-placeholder admin-toolbar-chip-placeholder flex shrink-0 items-center rounded-lg border border-transparent font-semibold">
                <span className="invisible">{label}
                </span>
              </Skeleton>
            ))}
          </div>
          <div className={`${postStyles.search} admin-toolbar-search-row`}>
            <Skeleton className="admin-toolbar-search-placeholder h-11 min-w-0 flex-1 rounded-xl md:h-9" />
            <AdminToolbarFilterSkeleton />
          </div>
        </div>
        <div className={`${postStyles.secondary} admin-toolbar-secondary`}>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Skeleton className={`${postStyles.filterLabel} h-4 w-16`} />
            <Skeleton className={`${postStyles.category} w-full`} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Skeleton className={postStyles.sort} />
            <div className="admin-toolbar-control flex h-8 items-center gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-0.5">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        </div>
      </section>
      <AdminPostsContentSkeleton viewMode={viewMode} />
    </div>
  </div>
);

export const AdminPostsContentSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true">
    <span className="sr-only">Loading community posts…</span>
    {viewMode === "grid" ? (
      <div aria-hidden="true" className={postStyles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="min-w-0 bg-card border border-border/80 rounded-2xl overflow-hidden flex flex-col shadow-2xs">
            <div className="relative h-40 sm:h-44 border-b border-border/40">
              <Skeleton className="h-full w-full rounded-none" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-md bg-background/60" />
                <Skeleton className="h-5 w-20 rounded-md bg-background/60" />
              </div>
            </div>
            <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-2.5">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 sm:h-5 w-full" />
                <Skeleton className="h-4 sm:h-5 w-5/6" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2">
                <Skeleton className="h-4 w-32 max-w-[60%]" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-end pt-1"><Skeleton className="h-8 w-8 rounded-xl" /></div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div aria-hidden="true">
        <div className={postStyles.compactList}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={postStyles.listRow}>
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-5/6" />
                  <Skeleton className="h-4 w-28 max-w-full" />
                </div>
                <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
              </div>
              <div className="flex gap-1.5"><Skeleton className="h-5 w-20 rounded-md" /><Skeleton className="h-5 w-20 rounded-md" /></div>
              <div className="flex flex-wrap justify-between gap-3 border-t border-border/60 pt-2">
                <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className={`${postStyles.table} overflow-x-auto`}>
        <div className="min-w-[850px]">
          <div className="grid grid-cols-[2.5fr_1fr_1fr_0.8fr_0.6fr_0.6fr_80px] gap-4 h-12 items-center px-4 bg-muted/40 border-b border-border/70">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-4 w-16 max-w-full" />)}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2.5fr_1fr_1fr_0.8fr_0.6fr_0.6fr_80px] gap-4 items-center px-4 py-3 border-b border-border/50 last:border-0">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="w-14 h-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 max-w-full rounded-md" />
              <Skeleton className="h-6 w-20 max-w-full rounded-md" />
              <Skeleton className="h-4 w-16 max-w-full" />
              <Skeleton className="h-4 w-8 justify-self-end" />
              <Skeleton className="h-4 w-8 justify-self-end" />
              <Skeleton className="h-8 w-8 justify-self-end rounded-xl" />
            </div>
          ))}
        </div>
        </div>
      </div>
    )}
  </div>
);

export const AdminPostDetailSkeleton = ({ onBack }: { onBack?: () => void } = {}) => (
  <div role="status" aria-busy="true" className={contentStyles.detailPage}>
    {onBack ? <BackButton onBack={onBack} label="Back to Posts" /> : <Skeleton aria-hidden="true" className="mb-3 h-8 w-16 rounded-lg" />}
    <div aria-hidden="true" className="space-y-6 sm:space-y-8">
      <div className={contentStyles.detailArticle}>
        <div className={contentStyles.detailImage}>
          <Skeleton className="w-full h-full rounded-none" />
          <Skeleton className="absolute top-4 left-4 h-7 w-24 rounded-md bg-background/60" />
        </div>
        <div className={contentStyles.detailHeader}>
          <div className="flex flex-wrap gap-2"><Skeleton className="h-6 w-20 rounded-md" /><Skeleton className="h-6 w-20 rounded-md" /></div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 sm:h-9 w-full" />
              <Skeleton className="h-7 sm:h-9 w-3/4" />
            </div>
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          </div>
          <div className="community-post-metadata flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="community-post-metadata-primary flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-40 max-w-full" />
            </div>
            <div className="flex shrink-0 flex-wrap gap-2"><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div>
          </div>
        </div>
        <div className="border-t border-border/60" />
        <div className={contentStyles.detailBody}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 sm:h-6 w-full" />
              <Skeleton className="h-5 sm:h-6 w-full" />
              <Skeleton className="h-5 sm:h-6 w-3/4" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border/60">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-lg" />)}
        </div>
      </div>
    </div>
    <span className="sr-only">Loading post details…</span>
  </div>
);

/* ─── Resident Post Detail Skeleton ─── */
export const ResidentPostDetailSkeleton = () => (
  <div role="status" aria-label="Loading community post" className={contentStyles.detailPage}>
    <Skeleton className="mb-3 h-8 w-32 rounded-lg" />
    <div className="space-y-6 md:space-y-7 lg:space-y-8">
    <div className={contentStyles.detailArticle}>
    {/* Hero image */}
    <div className={contentStyles.detailImage}>
      <Skeleton className="absolute inset-0 rounded-none" />
    </div>

    {/* Title & description */}
    <div className={contentStyles.detailHeader}>
      <Skeleton className={`${contentStyles.detailTitle} h-[1.25em] w-3/4`} />
      <div className="community-post-metadata-primary flex flex-wrap items-center gap-x-4 gap-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-40 max-w-full" /></div>
    </div>

    {/* Action bar */}
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-24 rounded-lg md:h-9 md:w-28" />
      <Skeleton className="h-8 w-24 rounded-lg md:h-9 md:w-28" />
    </div>
    <div className="border-t border-border/60" />

    {/* Body */}
    <div className={contentStyles.detailBody}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>

    {/* Tags */}
    <div className="flex flex-wrap gap-2 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-20 rounded-md" />
      ))}
    </div>
    </div>

    {/* Related Posts */}
    <div className="space-y-4 border-t border-border/60 pt-6">
      <Skeleton className="h-5 w-28" />
      <ContentCardsSkeleton count={3} />
    </div>
    </div>
  </div>
);

/* ─── Route Manager Page Skeleton ─── */
const RouteManagerCardSkeleton = ({ showDay = false }: { showDay?: boolean }) => (
  <div className={`${routeStyles.card} flex flex-col gap-3.5`}>
    {showDay && <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-2.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-28 rounded-md" /></div>}
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-1"><Skeleton className="h-5 w-32 max-w-full" /><Skeleton className="h-5 w-20 rounded-md" /></div>
      </div>
      <Skeleton className="size-8 shrink-0 rounded-lg" />
    </div>
    <div className="mt-auto space-y-3">
      <div className="flex min-w-0 items-start justify-between gap-2"><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-5 w-16 shrink-0 rounded-md" /></div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <div className="min-w-0 space-y-1"><Skeleton className="h-4 w-20 max-w-full" /><Skeleton className="h-4 w-16" /></div>
        <div className="min-w-0 space-y-1 border-l border-border/60 pl-2.5"><Skeleton className="h-4 w-24 max-w-full" /><Skeleton className="h-4 w-12" /></div>
      </div>
    </div>
  </div>
);

export const RouteManagerPageSkeleton = ({ viewMode = "DAY_VIEW" }: { viewMode?: "DAY_VIEW" | "TABLE_VIEW" }) => (
  <div role="status" aria-busy="true" className="resident-page admin-community admin-routes w-full min-w-0 max-w-[1600px] mx-auto pb-10">
    <span className="sr-only">Loading collection routes…</span>
    <div aria-hidden="true" className="space-y-4 sm:space-y-6">
      <ResidentPageHeaderSkeleton className="admin-module-header" title="Route Manager" description="Plan collection days, assign trucks, and verify every barangay stop."
        actionsClassName="admin-module-header-actions"
        actions={<Skeleton className={`${postStyles.action} flex items-center`}><span className="size-3.5 shrink-0" /><span className="invisible">Create route</span></Skeleton>} />

      <AdminKpiSkeleton count={4} />

      <section className={`${routeStyles.toolbar} admin-toolbar`}>
        <div className={`${routeStyles.primary} admin-toolbar-primary`}>
          <div className="admin-toolbar-chips flex items-center gap-1.5 overflow-hidden">
            {["w-24", "w-[72px]", "w-[74px]"].map((width, i) => (
              <Skeleton key={i} className={cn("admin-toolbar-chip-placeholder h-8 shrink-0 rounded-lg", width)} />
            ))}
          </div>
          <div className="admin-toolbar-desktop-only">
            <div className={`${routeStyles.view} flex items-center gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-1`}>
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        </div>
        <div className={`${routeStyles.secondary} admin-toolbar-search-section`}>
          <div className={`${routeStyles.search} admin-toolbar-search-row`}>
            <Skeleton className="admin-toolbar-search-placeholder h-11 min-w-0 flex-1 rounded-xl md:h-9" />
            <AdminToolbarFilterSkeleton />
          </div>
          <div className="admin-toolbar-desktop-only">
            <Skeleton className={routeStyles.daySelect} />
          </div>
        </div>
      </section>

      {viewMode === "DAY_VIEW" ? (
        <div className="space-y-4 sm:space-y-5">
          {Array.from({ length: 2 }).map((_, day) => (
            <div key={day} className={routeStyles.day}>
              <div className={routeStyles.dayHeader}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <div className="min-w-0 space-y-1"><Skeleton className="h-6 w-24 max-w-full" /><Skeleton className="h-5 w-36 max-w-full rounded-md" /></div>
                </div>
                <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
              </div>
              <div className={routeStyles.dayGrid}>
                {Array.from({ length: 3 }).map((_, i) => <RouteManagerCardSkeleton key={i} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
        <div className={routeStyles.compactList}><div className={routeStyles.grid}>{Array.from({ length: 7 }).map((_, i) => <RouteManagerCardSkeleton key={i} showDay />)}</div></div>
        <div className={`${routeStyles.table} overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-2xs`}>
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1.2fr_0.7fr_60px] items-center gap-4 border-b border-border/80 bg-muted/30 px-5 py-3.5">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-4 w-20 max-w-full" />)}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1.2fr_0.7fr_60px] items-center gap-4 border-b border-border/60 px-5 py-3.5 last:border-0">
                <div className="space-y-1"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-24 rounded-md" /></div>
                <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-8 w-8 justify-self-end rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  </div>
);

/* ─── Barangay Manager Skeletons ─── */
export const BarangayStreetRowsSkeleton = () => (
  <div role="status" aria-busy="true" className="divide-y divide-border/40">
    <span className="sr-only">Loading streets…</span>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={barangayStyles.streetRow}>
        <div className={barangayStyles.streetName}>
          <Skeleton className="h-4 w-32 max-w-[60%]" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
        </div>
        <div className={barangayStyles.counts}>
          <div className={barangayStyles.count}><Skeleton className="h-4 w-6" /><Skeleton className={cn(barangayStyles.countLabel, "h-3 w-20")} /></div>
          <div className={barangayStyles.count}><Skeleton className="h-4 w-6" /><Skeleton className={cn(barangayStyles.countLabel, "h-3 w-16")} /></div>
        </div>
        <div className={barangayStyles.actions}>
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const BarangayManagerPageSkeleton = () => (
  <div role="status" aria-busy="true" className={barangayStyles.page}>
    <span className="sr-only">Loading barangays…</span>
    <div aria-hidden="true" className="space-y-4 sm:space-y-6">
      <ResidentPageHeaderSkeleton className="admin-module-header" title="Barangay Management" description="Manage municipal barangays, street records, and collection service availability." />

      <AdminKpiSkeleton />

      <div className={barangayStyles.layout}>
        <aside className={barangayStyles.panel}>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1 h-4 w-60 max-w-full" />
          <Skeleton className="mt-3 h-11 w-full rounded-lg md:h-9" />
          <div className={barangayStyles.list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn(barangayStyles.choice, "border-border/50 bg-muted/10")}>
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-28 max-w-full" /></div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border/60 pt-3.5"><Skeleton className="h-4 w-24" /></div>
        </aside>

        <section className={cn(barangayStyles.panel, barangayStyles.detail)}>
          <div className={barangayStyles.header}>
            <div className="min-w-0 flex-1 basis-40 space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="h-4 w-28" /></div>
            <Skeleton className={cn(barangayStyles.action, "ml-auto w-28")} />
          </div>
          <div className={barangayStyles.service}>
            <div className="flex min-w-0 items-start gap-2.5">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 space-y-1.5"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-56 max-w-full" /></div>
            </div>
            <Skeleton className="mt-1 h-6 w-11 shrink-0 rounded-full" />
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-24" /></div>
            <Skeleton className="mt-2.5 h-11 w-full rounded-lg md:h-9" />
            <div className={barangayStyles.streets}>
              <div className={barangayStyles.streetHeader}>
                {["w-24", "mx-auto w-20", "mx-auto w-20", "ml-auto w-16"].map((width, i) => <Skeleton key={i} className={cn("h-3", width)} />)}
              </div>
              <BarangayStreetRowsSkeleton />
            </div>
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
          </div>
        </section>
      </div>
    </div>
  </div>
);

/* ─── Resident Manager Skeletons ─── */
export const ResidentManagerRowsSkeleton = () => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={i} aria-busy="true" className="pointer-events-none hover:bg-transparent">
        <TableCell className="py-3 pl-5">
          {i === 0 && <span className="sr-only">Loading residents…</span>}
          <div className="resident-manager-identity flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-1"><Skeleton className="resident-manager-resident-name h-4 w-28 max-w-full" /><Skeleton className="resident-manager-inline-username h-3 w-20 max-w-full md:hidden" /></div>
          </div>
          <div className={residentManagerStyles.mobileFooter}>
            <div className="resident-manager-inline-barangay flex min-w-0 items-center gap-1.5"><Skeleton className="size-3.5 shrink-0" /><Skeleton className="h-4 w-24 max-w-full" /></div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="hidden lg:table-cell"><div className="space-y-1"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div></TableCell>
        <TableCell><div className="flex items-center gap-1.5"><Skeleton className="size-3 shrink-0" /><Skeleton className="h-4 w-24 max-w-full" /></div></TableCell>
        <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20 max-w-full rounded-md" /></TableCell>
        <TableCell className="pr-5 text-right"><Skeleton className="resident-manager-menu ml-auto h-8 w-8 rounded-lg" /></TableCell>
      </TableRow>
    ))}
  </>
);

export const ResidentManagerPageSkeleton = () => (
  <div role="status" aria-busy="true" className={residentManagerStyles.page}>
    <span className="sr-only">Loading resident accounts…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-4 sm:space-y-6">
      <ResidentPageHeaderSkeleton className="admin-module-header" title="Resident Management" description="View and manage all registered resident accounts across Candelaria." />

      <AdminKpiSkeleton />

      <div className={residentManagerStyles.directory}>
        <div className="admin-toolbar admin-toolbar-resident-controls">
          <div className={residentManagerStyles.toolbar}>
            <div className="admin-toolbar-heading min-w-0 space-y-1">
              <Skeleton className="h-6 w-36 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className={`${residentManagerStyles.fields} admin-toolbar-search-row`}>
              <Skeleton className={cn(residentManagerStyles.search, "admin-toolbar-search-placeholder h-11 w-full rounded-lg sm:w-64 md:h-9 lg:w-72")} />
              <div className="admin-toolbar-desktop-only">
                <Skeleton className="h-9 w-full rounded-xl sm:w-[170px]" />
              </div>
              <AdminToolbarFilterSkeleton />
            </div>
          </div>
          <div className={`${residentManagerStyles.filterRow} admin-toolbar-resident-chips`}>
            <div className={cn(residentManagerStyles.filters, "admin-toolbar-chips flex items-center gap-1.5 overflow-hidden pb-1 sm:pb-0")}>
              {["w-[110px]", "w-[68px]", "w-[102px]", "w-[74px]"].map((width, i) => <Skeleton key={i} className={cn("resident-manager-filter-placeholder admin-toolbar-chip-placeholder h-8 shrink-0 rounded-lg", width)} />)}
            </div>
          </div>
        </div><div className={residentManagerStyles.list}>
          <Table className={residentManagerStyles.table}>
            <TableHeader className="border-b border-border/80 bg-muted/20">
              <TableRow>
                <TableHead className="py-3 pl-5"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3 md:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3 lg:table-cell"><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="py-3"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3 xl:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3 xl:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="py-3"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="w-12 py-3 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody><ResidentManagerRowsSkeleton /></TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
);

export const ResidentManagerProfileSkeleton = () => (
  <div role="status" aria-busy="true" className={residentManagerStyles.page}>
    <span className="sr-only">Loading resident profile…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-4 sm:space-y-6">
      <div><Skeleton className="h-7 w-48" /><Skeleton className="mt-0.5 h-4 w-[490px] max-w-full" /></div>
      <div className={cn(residentManagerStyles.profileCard, "space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs sm:p-7")}>
        <div className={cn(residentManagerStyles.profileHeader, "flex flex-col justify-between gap-5 sm:flex-row sm:items-center")}>
          <div className={cn(residentManagerStyles.profileIdentity, "flex items-center gap-4")}>
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-1.5"><div className={cn(residentManagerStyles.profileName, "flex items-center gap-2.5")}><Skeleton className="h-6 w-44 max-w-full" /><Skeleton className="h-6 w-16 shrink-0 rounded-md" /></div><Skeleton className="h-4 w-24 max-w-full" /></div>
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className={cn(residentManagerStyles.profileDetails, "grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border/60 pt-6 sm:grid-cols-2 lg:grid-cols-3")}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-36 max-w-full" /></div>)}
        </div>
      </div>
      <div className="space-y-4">
        <div className={cn(residentManagerStyles.historyHeader, "flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center")}><div className="min-w-0 space-y-1"><Skeleton className="h-6 w-48 max-w-full" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-6 w-16 shrink-0 rounded-md" /></div>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
          <Table className={residentManagerStyles.historyTable}>
            <TableHeader className="border-b border-border/80 bg-muted/40">
              <TableRow className="hover:bg-transparent">
                {["w-24", "w-20", "w-24", "w-16"].map((width, i) => <TableHead key={i} className="py-3"><Skeleton className={cn("h-4 max-w-full", width)} /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell><Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="resident-manager-inline-report mt-1 h-4 w-24 max-w-full" /><Skeleton className="resident-manager-inline-report mt-1 h-3 w-20 max-w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 max-w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 max-w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 max-w-full rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Shared admin page title skeleton ─── */
const AdminPageTitleSkeleton = ({ title, description, badge }: {
  title: string;
  description: string;
  badge?: string;
}) => (
  <ResidentPageHeaderSkeleton
    className="admin-module-header"
    title={title}
    description={description}
    titleBadge={badge && <Skeleton className="hidden rounded-md border px-2.5 py-0.5 text-ui-caption font-semibold sm:inline-flex"><span className="invisible">{badge}</span></Skeleton>}
  />
);

/* ─── Admin Truck Tracking Page Skeleton ─── */
export const AdminTruckTrackingPageSkeleton = ({ title, description }: { title: string; description: string }) => (
  <div role="status" aria-label="Loading live truck tracking…" aria-busy="true" className={truckTrackingStyles.page}>
    <div aria-hidden="true" className="pointer-events-none space-y-5">
      <AdminPageTitleSkeleton title={title} description={description} badge="Candelaria" />

      <AdminKpiSkeleton />

      <div className={truckTrackingStyles.workspace}>
        <div className={truckTrackingStyles.switcher}>
          <div className="flex min-w-0 items-center gap-2"><Skeleton className="size-4 shrink-0" /><Skeleton className="h-4 w-24 max-w-full" /></div>
          <Skeleton className="h-11 w-32 shrink-0 rounded-xl" />
        </div>
        <div className={cn(truckTrackingStyles.map, "admin-tracking-map relative isolate flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm")}>
          <div className="admin-tracking-map-info flex min-h-16 shrink-0 items-center gap-2.5 border-b border-border/70 px-3.5 py-3">
            <Skeleton className="size-7 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-48 max-w-full" /></div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 space-y-1 rounded-xl border border-border/70 bg-card p-0.5 shadow-2xs">
              <Skeleton className="size-11 rounded-lg" /><Skeleton className="size-11 rounded-lg" />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-card px-3 py-2">
            <Skeleton className="h-3 w-28" />
            <div className="admin-tracking-map-actions ml-auto rounded-xl border border-border/70 p-0.5"><Skeleton className="flex h-11 min-w-11 items-center gap-1.5 rounded-lg px-2.5"><span className="size-3.5" /><span className="admin-tracking-map-label hidden text-xs sm:inline invisible">Fit Trucks</span></Skeleton></div>
          </div>
        </div>

        <div className={cn(truckTrackingStyles.fleet, "admin-tracking-fleet-hidden")}>
          <div className={truckTrackingStyles.fleetHeader}>
            <div className={truckTrackingStyles.fleetTabs}>
              <Skeleton className="h-full rounded-lg" />
              <Skeleton className="h-full rounded-lg" />
            </div>
            <Skeleton className={cn(truckTrackingStyles.minimize, "rounded-xl")} />
          </div>
          <div className={truckTrackingStyles.fleetBody}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn(truckTrackingStyles.truckCard, "border-border/70 bg-card")}>
                <div className="p-3.5 sm:p-4">
                <div className={truckTrackingStyles.truckHeader}>
                  <div className={truckTrackingStyles.truckIdentity}>
                    <Skeleton className="h-9 w-9 shrink-0 rounded-xl" /><div className="min-w-0"><div className={truckTrackingStyles.truckName}><Skeleton className="h-4 w-16 max-w-full" /><Skeleton className="h-5 w-16 rounded-md" /></div></div>
                  </div>
                  <div className={truckTrackingStyles.truckBadges}><Skeleton className="h-5 w-16 shrink-0 rounded-lg" /></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
                  <Skeleton className="h-4 w-32 max-w-full" />
                  <Skeleton className="h-4 w-10 shrink-0" />
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="mx-auto h-3 w-[670px] max-w-full" />
    </div>
  </div>
);

/* ─── Waste Reports Page Skeleton ─── */
export const WasteReportRowsSkeleton = ({ count = 5 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <TableRow key={i} aria-hidden="true" className="pointer-events-none border-b border-border/60 hover:bg-transparent">
        <TableCell className="py-3">
          <div className={wasteReportStyles.rowHeading}><Skeleton className="h-4 w-28 max-w-full" /><Skeleton className={cn(wasteReportStyles.mobileStatus, "h-6 w-20 rounded-md")} /></div>
          <div className={wasteReportStyles.compact}><Skeleton className={cn(wasteReportStyles.compactTitle, "h-5 w-40 max-w-full")} /><div className={wasteReportStyles.location}><Skeleton className="mt-0.5 size-3.5 shrink-0" /><Skeleton className="h-4 w-36 max-w-full" /></div></div>
          <div className={wasteReportStyles.tabletMetadata}><div className="flex items-center gap-1.5"><Skeleton className="waste-report-date-icon size-3.5 shrink-0" /><Skeleton className="h-3 w-20" /></div><div className={cn(wasteReportStyles.mobilePhotoLabel, "items-center gap-1.5")}><Skeleton className="size-3.5" /><Skeleton className="h-3 w-12" /></div></div>
        </TableCell>
        <TableCell className="py-3"><Skeleton className="h-5 w-32 max-w-full rounded-md" /></TableCell>
        <TableCell className="py-3"><div className="space-y-1"><Skeleton className="h-4 w-24 max-w-full" /><Skeleton className="h-3 w-32 max-w-full" /></div></TableCell>
        <TableCell className="py-3"><Skeleton className="h-4 w-20 max-w-full" /></TableCell>
        <TableCell className="py-3 text-center"><Skeleton className="mx-auto h-5 w-9 rounded-full" /></TableCell>
        <TableCell className="py-3"><Skeleton className="h-6 w-20 max-w-full rounded-md" /></TableCell>
        <TableCell className="py-3 pr-4 text-right"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
      </TableRow>
    ))}
  </>
);

export const WasteReportsPageSkeleton = ({ title, description }: { title: string; description: string }) => (
  <div role="status" aria-label="Loading waste reports…" aria-busy="true" className={wasteReportStyles.page}>
    <div aria-hidden="true" className="pointer-events-none space-y-4 sm:space-y-6">
      <AdminPageTitleSkeleton title={title} description={description} />

      <AdminKpiSkeleton />

      <section className="admin-toolbar overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
        <div className={`${wasteReportStyles.primary} admin-toolbar-primary`}>
          <div className="admin-toolbar-chips flex min-w-0 items-center gap-1.5 overflow-hidden">
            {["All", "Submitted", "Under Review", "Dispatched", "Resolved"].map((label) => (
              <Skeleton key={label} className="admin-toolbar-chip-placeholder flex h-[34px] shrink-0 items-center rounded-lg border px-3.5 text-xs font-semibold"><span className="invisible">{label}</span></Skeleton>
            ))}
          </div>
          <div className={`${wasteReportStyles.search} admin-toolbar-search-row`}>
            <Skeleton className="admin-toolbar-search-placeholder h-11 min-w-0 flex-1 rounded-lg md:h-9" />
            <AdminToolbarFilterSkeleton className={wasteReportStyles.mobileFilters} />
          </div>
        </div>
        <div className={wasteReportStyles.secondary}>
          <Skeleton className="mr-1 h-4 w-16 shrink-0" />
          <Skeleton className="h-9 w-[130px] rounded-xl" />
          <Skeleton className="h-9 w-[130px] rounded-xl" />
          <Skeleton className="h-9 w-[120px] rounded-xl" />
          <Skeleton className="ml-auto h-9 w-[130px] rounded-xl" />
        </div>
      </section>

      <div className={wasteReportStyles.list}>
        <div className="overflow-x-auto">
          <Table className={wasteReportStyles.table}>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/30">
                <TableHead className="py-3.5"><Skeleton className="h-3 w-16 max-w-full" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="h-3 w-24 max-w-full" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="h-3 w-16 max-w-full" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="h-3 w-20 max-w-full" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="mx-auto h-3 w-10 max-w-full" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="h-3 w-12 max-w-full" /></TableHead>
                <TableHead className="w-10 py-3.5 pr-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody><WasteReportRowsSkeleton /></TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
);

export const WasteReportDetailBodySkeleton = () => (
  <div role="status" aria-busy="true" className="space-y-3.5">
    <span className="sr-only">Loading report details…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-3.5">
      <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
        <Skeleton className="h-4 w-12" />
        <div className="grid grid-cols-4 gap-1.5">{["Submitted", "Under Review", "Dispatched", "Resolved"].map((label) => <Skeleton key={label} className="flex min-h-8 items-center justify-center rounded-lg border px-1 py-1.5 text-center"><span className="invisible w-full px-0.5 text-ui-overline font-medium leading-tight">{label}</span></Skeleton>)}</div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 bg-muted/20 px-4 py-2.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-36" /></div>
        <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-28 max-w-full" /><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-3 w-28 max-w-full" /></div>)}</div>
      </div>
      <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div></div>
      <div className="space-y-2"><div className="flex justify-between gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div><div className="flex flex-wrap gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="size-20 rounded-xl border border-border/80" />)}</div></div>
      {["response", "notes"].map((section) => <div key={section} className="space-y-2"><div className="flex justify-between gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-20 w-full rounded-xl border border-border/70" /><Skeleton className="ml-auto h-8 w-28 rounded-xl" /></div>)}
    </div>
  </div>
);

/* ─── Collector Manager Skeletons ─── */
export const CollectorManagerPageSkeleton = ({ activeTab = "drivers" }: { activeTab?: "drivers" | "trucks" }) => (
  <div role="status" aria-busy="true" className={collectorManagerStyles.page}>
    <span className="sr-only">Loading collectors and trucks…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-6 sm:space-y-7">
      <ResidentPageHeaderSkeleton className="admin-module-header" title="Collector Management" description="Manage municipal waste collector personnel, truck assignments, and truck statuses."
        actionsClassName="admin-module-header-actions"
        actions={<Skeleton className={`${collectorManagerStyles.action} flex items-center`}><span className="size-3.5 shrink-0" /><span className="invisible">{activeTab === "drivers" ? "Add Collector" : "Add Truck"}</span></Skeleton>} />

      <AdminKpiSkeleton />

      <section className="admin-toolbar min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
        <div className={`${collectorManagerStyles.primary} admin-toolbar-primary`}>
          <div className={cn(collectorManagerStyles.filters, "admin-toolbar-chips flex items-center gap-1.5 overflow-hidden pb-1 sm:pb-0")}>
            {(activeTab === "drivers" ? ["w-[112px]", "w-[75px]", "w-[105px]"] : ["w-[100px]", "w-[108px]", "w-[105px]"]).map((width, i) => <Skeleton key={i} className={cn("collector-manager-filter-placeholder admin-toolbar-chip-placeholder h-[34px] shrink-0 rounded-lg", width)} />)}
          </div>
          <div className="admin-toolbar-desktop-only">
            <div className={cn(collectorManagerStyles.view, "inline-flex items-center gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-1")}>
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        </div>
        <div className={`${collectorManagerStyles.secondary} admin-toolbar-search-section`}>
          <div className={`${collectorManagerStyles.fields} admin-toolbar-search-row`}>
            <Skeleton className={cn(collectorManagerStyles.search, "admin-toolbar-search-placeholder h-11 rounded-lg md:h-9")} />
            <div className="admin-toolbar-desktop-only">
              <Skeleton className={collectorManagerStyles.assignment} />
            </div>
            <AdminToolbarFilterSkeleton />
          </div>
        </div>
      </section>

      <div className={collectorManagerStyles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={collectorManagerStyles.card}>
            <div className={collectorManagerStyles.cardHeader}>
              <div className={collectorManagerStyles.cardIdentity}><Skeleton className={cn("h-11 w-11 shrink-0", activeTab === "drivers" ? "rounded-full" : "rounded-2xl")} /><div className="min-w-0 space-y-1.5"><Skeleton className="h-5 w-28 max-w-full" /><Skeleton className="h-4 w-20 max-w-full" /></div></div>
              <div className={collectorManagerStyles.cardControls}><Skeleton className="h-6 w-16 rounded-md" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
            </div>
            <div className="space-y-2 border-t border-border/60 pt-2">
              {activeTab === "trucks" && <Skeleton className="h-6 w-24 max-w-full rounded-lg" />}
              {Array.from({ length: activeTab === "drivers" ? 4 : 1 }).map((_, row) => <div key={row} className="flex items-center gap-2"><Skeleton className="h-3.5 w-3.5 shrink-0 rounded" /><Skeleton className="h-4 w-32 max-w-full" /></div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CollectorManagerProfileSkeleton = ({ kind = "collector" }: { kind?: "collector" | "truck" }) => (
  <div role="status" aria-busy="true" className={collectorManagerStyles.detailPage}>
    <span className="sr-only">Loading {kind === "truck" ? "truck details" : "collector profile"}…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-6">
      <div><Skeleton className="h-7 w-48" /><Skeleton className="mt-0.5 h-4 w-[550px] max-w-full" /></div>
      <div className={collectorManagerStyles.profileCard}>
        <div className={collectorManagerStyles.profileHeader}>
          <div className={collectorManagerStyles.profileIdentity}><Skeleton className={cn("h-14 w-14 shrink-0", kind === "collector" ? "rounded-full" : "rounded-2xl")} /><div className="min-w-0 space-y-1.5"><div className={collectorManagerStyles.profileName}><Skeleton className="h-6 w-40 max-w-full" /><Skeleton className="h-6 w-16 shrink-0 rounded-md" /></div><Skeleton className="h-4 w-28 max-w-full" /></div></div>
          <div className={collectorManagerStyles.profileActions}><Skeleton className="h-9 w-28 rounded-xl" /><Skeleton className={cn("h-9 rounded-xl", kind === "collector" ? "w-32" : "w-48")} />{kind === "collector" && <Skeleton className="h-9 w-28 rounded-xl" />}</div>
        </div>
        <div className={collectorManagerStyles.profileDetails}>
          {Array.from({ length: kind === "collector" ? 6 : 5 }).map((_, i) => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-28 max-w-full" /><Skeleton className="h-4 w-36 max-w-full" /></div>)}
        </div>
      </div>
      {kind === "collector" && <div className="space-y-4"><div><Skeleton className="h-6 w-44 max-w-full" /><Skeleton className="mt-0.5 h-4 w-80 max-w-full" /></div><CollectorManagerActivitySkeleton /></div>}
    </div>
  </div>
);

export const CollectorManagerActivitySkeleton = () => (
  <div role="status" aria-busy="true" className="pointer-events-none space-y-3">
    <span className="sr-only">Loading collection activity…</span>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} aria-hidden="true" className={collectorManagerStyles.activity}>
        <div className={collectorManagerStyles.activityHeader}>
          <div className={collectorManagerStyles.activityBadges}><Skeleton className="h-5 w-28" /><Skeleton className="h-6 w-24 rounded-md" /><Skeleton className="h-6 w-20 rounded-md" /></div>
          <Skeleton className="h-4 w-36 max-w-full" />
        </div>
        <div className="flex items-center gap-3"><Skeleton className="h-4 w-24 shrink-0" /><Skeleton className="h-2 min-w-0 flex-1 rounded-full" /></div>
      </div>
    ))}
  </div>
);

/* ─── Analytics Dashboard Skeleton ─── */
export const AnalyticsDashboardSkeleton = ({ title, description }: { title: string; description: string }) => (
  <main role="status" aria-busy="true" className={cn(analyticsStyles.page, "space-y-0 sm:space-y-0")}>
    <span className="sr-only">Loading analytics dashboard…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-5 sm:space-y-6">
      <AdminPageTitleSkeleton title={title} description={description} />

      <section className={`${analyticsStyles.filters} admin-toolbar admin-toolbar-analytics`}>
        <Skeleton className="h-4 w-60 max-w-full" />
        <div className={`${analyticsStyles.fields} admin-toolbar-secondary`}>
          <Skeleton className={cn(analyticsStyles.period, "h-10 w-full rounded-xl")} />
          <Skeleton className={cn(analyticsStyles.barangay, "h-10 w-full rounded-xl")} />
        </div>
        <AdminToolbarFilterSkeleton />
      </section>

      <KPICardsSkeleton />

      <nav className={cn(analyticsStyles.nav, "overflow-hidden")}>
        <div className="analytics-tabs flex min-w-0 items-center gap-1.5 overflow-hidden pb-1 sm:pb-0">
          {[86, 151, 144, 147, 93, 137, 147].map((width, i) => (
            <Skeleton key={i} className="analytics-tab-placeholder h-[34px] shrink-0 rounded-lg" style={{ width }} />
          ))}
        </div>
      </nav>

      <section className={analyticsStyles.content}>
        <div className="space-y-1 pb-1">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="h-4 w-[500px] max-w-full" />
        </div>
        <div className="analytics-grid grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="analytics-card rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5"><Skeleton className="h-8 w-8 shrink-0 rounded-xl max-w-full" /><div className="min-w-0 space-y-1"><Skeleton className="h-4 w-52 max-w-full" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div>
              <Skeleton className="h-7 w-12 shrink-0 rounded-lg max-w-full" />
            </div>
            <Skeleton className="h-[230px] w-full rounded-xl max-w-full" />
          </div>
          <div className="analytics-card rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5"><Skeleton className="h-8 w-8 shrink-0 rounded-xl max-w-full" /><div className="min-w-0 space-y-1"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div>
              <Skeleton className="h-7 w-10 shrink-0 max-w-full" />
            </div>
            <div className="flex h-[200px] items-center justify-center"><Skeleton className="h-[155px] w-[155px] rounded-full max-w-full" /></div>
            <div className="flex flex-wrap justify-center gap-3 border-t border-border/60 pt-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-20" />)}</div>
          </div>
        </div>
        <div className="analytics-grid grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="analytics-card rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center gap-2.5"><Skeleton className="h-8 w-8 shrink-0 rounded-xl" /><div className="min-w-0 space-y-1"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-3.5 w-52 max-w-full" /></div></div>
            <div className="divide-y divide-border/60 rounded-xl bg-muted/35 px-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex justify-between gap-4 py-3"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-4 w-8 max-w-full" /></div>)}</div>
          </div>
          <div className="analytics-card rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-2.5"><Skeleton className="h-8 w-8 shrink-0 rounded-xl" /><div className="min-w-0 space-y-1"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3.5 w-56 max-w-full" /></div></div><Skeleton className="h-4 w-28 max-w-full shrink-0" /></div>
            <Skeleton className="h-[150px] w-full rounded-xl max-w-full" />
          </div>
        </div>
      </section>
    </div>
  </main>
);

/* ─── Audit Logs Skeleton ─── */
export const AuditLogRowsSkeleton = () => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={i} aria-hidden="true" className="pointer-events-none border-b border-border/60 hover:bg-transparent">
        <TableCell className="py-3.5 text-center"><Skeleton className="mx-auto size-6 rounded-lg" /></TableCell>
        <TableCell className="py-3.5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-1 h-3 w-16" /></TableCell>
        <TableCell className="py-3.5"><Skeleton className="h-4 w-28" /><Skeleton className="mt-1 h-3 w-16" /></TableCell>
        <TableCell className="py-3.5"><Skeleton className="h-6 w-28 rounded-md" /></TableCell>
        <TableCell className="py-3.5"><Skeleton className="h-6 w-24 rounded-md" /></TableCell>
        <TableCell className="py-3.5"><Skeleton className="h-5 w-28 rounded" /></TableCell>
        <TableCell className="py-3.5"><Skeleton className="h-4 w-52 max-w-full" /><Skeleton className="mt-1 h-4 w-40 max-w-full" /></TableCell>
      </TableRow>
    ))}
  </>
);

export const AuditLogCardsSkeleton = () => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} aria-hidden="true" className={cn(auditStyles.card, "pointer-events-none cursor-default")}>
        <div className={auditStyles.cardHeader}>
          <div className={auditStyles.cardIdentity}>
            <div className={auditStyles.cardBadges}><Skeleton className="h-6 w-28 max-w-full rounded-md" /><Skeleton className="h-6 w-24 max-w-full rounded-md" /></div>
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-44 max-w-full" />
          </div>
          <Skeleton className={cn(auditStyles.expand, "cursor-default shadow-none")} />
        </div>
        <div className="mt-2 space-y-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
      </div>
    ))}
  </>
);

export const AuditLogsSkeleton = ({ title, description }: { title: string; description: string }) => (
  <div role="status" aria-busy="true" className={cn(auditStyles.page, "space-y-0 sm:space-y-0")}>
    <span className="sr-only">Loading audit logs…</span>
    <div aria-hidden="true" className="pointer-events-none space-y-6 sm:space-y-7">
      <AdminPageTitleSkeleton title={title} description={description} />

      <KPICardsSkeleton />

      <div className={`${auditStyles.toolbar} admin-toolbar admin-toolbar-audit`}>
        <div className={auditStyles.controls}>
          <div className={`${auditStyles.fields} admin-toolbar-search-row`}>
            <Skeleton className={cn(auditStyles.search, "admin-toolbar-search-placeholder h-11 min-w-0 rounded-lg md:h-9")} />
            <div className="admin-toolbar-desktop-only">
              <Skeleton className={cn(auditStyles.module, "w-full sm:w-40")} />
            </div>
            <AdminToolbarFilterSkeleton />
          </div>
          <div className={auditStyles.actions}>
            <div className={cn(auditStyles.presets, "admin-toolbar-chips flex min-w-0 items-center gap-1.5 pb-1 sm:pb-0")}>
              {["Today", "7 days", "30 days"].map((label) => <Skeleton key={label} className="audit-log-preset-placeholder admin-toolbar-chip-placeholder flex shrink-0 items-center rounded-lg px-4 h-9 text-xs font-semibold">
                <span className="invisible">{label}
                </span>
              </Skeleton>)}
            </div>
            <div className="admin-toolbar-desktop-only">
              <Skeleton className={cn(auditStyles.date, "w-32")} />
            </div>
          </div>
        </div>
      </div>

      <div className={auditStyles.list}>
        <div className={auditStyles.desktop}>
          <Table>
            <TableHeader>
              <TableRow className="pointer-events-none border-b border-border/80 bg-muted/30">
                <TableHead className="w-10 py-3.5" />
                {["w-20", "w-24", "w-32", "w-16", "w-28", "w-28"].map((width, i) => <TableHead key={i} className={cn("py-3.5", i === 5 && "min-w-[280px]")}><Skeleton className={cn("h-3.5 max-w-full", width)} /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody><AuditLogRowsSkeleton /></TableBody>
          </Table>
        </div>
        <div className={auditStyles.cards}><AuditLogCardsSkeleton /></div>
      </div>
    </div>
  </div>
);/* ─── Announcements Page Skeleton ─── */
export const AnnouncementsPageSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true" className="resident-page admin-community mx-auto min-w-0 w-full max-w-[1600px] pb-10">
    <span className="sr-only">Loading announcements…</span>
    <div aria-hidden="true" className="space-y-4 sm:space-y-6">
      <ResidentPageHeaderSkeleton className="admin-module-header" title="Announcements" description="Broadcast official MENRO advisories, schedule changes, and alerts to residents."
        actionsClassName="admin-module-header-actions"
        actions={<Skeleton className={`${postStyles.action} flex items-center`}><span className="size-3.5 shrink-0" /><span className="invisible">Create Announcement</span></Skeleton>} />

      <AdminKpiSkeleton />

      <section className={`${postStyles.toolbar} admin-toolbar`}>
        <div className={`${postStyles.primary} admin-toolbar-primary`}>
          <div className={`${postStyles.tabs} admin-toolbar-chips flex items-center gap-1.5 overflow-hidden pb-1 sm:pb-0`}>
            {["All Notices", "Active", "Scheduled", "Drafts", "Archived"].map((label) => (
              <Skeleton key={label} className="admin-community-tab-placeholder admin-toolbar-chip-placeholder flex shrink-0 items-center rounded-lg border border-transparent font-semibold">
                <span className="invisible">{label}
                </span>
              </Skeleton>
            ))}
          </div>
          <div className={`${postStyles.search} admin-toolbar-search-row`}>
            <Skeleton className="admin-toolbar-search-placeholder h-11 min-w-0 flex-1 rounded-xl md:h-9" />
            <AdminToolbarFilterSkeleton />
          </div>
        </div>
        <div className={`${postStyles.secondary} admin-toolbar-secondary`}>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Skeleton className={`${postStyles.filterLabel} h-4 w-16`} />
            <Skeleton className={`${postStyles.category} w-full`} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Skeleton className={postStyles.sort} />
            <div className="admin-toolbar-control flex h-8 items-center gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-0.5">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      <AnnouncementsContentSkeleton viewMode={viewMode} />
    </div>
  </div>
);

const AnnouncementCardSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
    {!compact && <div className="relative h-28 border-b border-border/40">
      <Skeleton className="h-full w-full rounded-none" />
      <Skeleton className="absolute left-3 top-3 h-5 w-28 rounded-md bg-background/60" />
    </div>}
    <div className={`flex min-w-0 flex-1 flex-col space-y-3.5 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
      {compact && <div className="flex flex-wrap gap-1.5"><Skeleton className="h-5 w-28 rounded-md" /><Skeleton className="h-5 w-16 rounded-md" /></div>}
      <div className="flex-1 space-y-1">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
      </div>
    </div>
  </div>
);

export const AnnouncementsContentSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true">
    <span className="sr-only">Loading announcements…</span>
    <div aria-hidden="true">
      {viewMode === "grid" ? (
        <div className={postStyles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <AnnouncementCardSkeleton key={i} />)}
        </div>
      ) : (
        <div>
          <div className={postStyles.compactList}>
            {Array.from({ length: 10 }).map((_, i) => <AnnouncementCardSkeleton key={i} compact />)}
          </div>
          <div className={`${postStyles.table} overflow-x-auto`}>
          <div className="min-w-[850px]">
            <div className="grid h-12 grid-cols-[2.5fr_1fr_1fr_1fr_0.8fr_0.8fr_70px] items-center gap-4 border-b border-border/70 bg-muted/40 px-4">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-4 w-16 max-w-full" />)}
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2.5fr_1fr_1fr_1fr_0.8fr_0.8fr_70px] items-center gap-4 border-b border-border/50 px-4 py-3 last:border-0">
                <div className="min-w-0 space-y-1"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-full" /></div>
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-7 w-7 justify-self-end rounded-lg" />
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

/* ─── Resident Dashboard Page Skeleton ─── */
export const ResidentDashboardCardSkeleton = ({ className }: { className?: string }) => (
  <div role="status" aria-label="Loading dashboard card" className={cn(dashboardStyles.hero, "h-full", className)}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <div className={dashboardStyles.heroFooter}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <Skeleton className="h-3 w-32" />
  </div>
);

export const ResidentDashboardUpdateSkeleton = ({ post = false }: { post?: boolean }) => (
  <div role="status" aria-label={post ? "Loading community update" : "Loading announcement"} className={cn(dashboardStyles.card, "resident-dashboard-update flex h-full flex-col overflow-hidden")}>
    <div className="h-0.5 shrink-0 bg-primary/20" />
    <div className={dashboardStyles.updateInner}>
      <div className={dashboardStyles.updateHeader}><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-20 rounded-md" /></div>
      <div className={post ? dashboardStyles.postBody : dashboardStyles.updateBody}>
        {post && <Skeleton className={dashboardStyles.postImage} />}
        <div className={cn(dashboardStyles.updateBody, "w-full")}>
          <Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className={dashboardStyles.updateFooter}><Skeleton className={post ? "h-7 w-28 rounded-lg" : "h-4 w-28"} /></div>
    </div>
  </div>
);

export const ResidentDashboardCalendarSkeleton = ({ dayCount, firstDayIndex }: { dayCount: number; firstDayIndex: number }) => (
  <div role="status" aria-label="Loading calendar" className={cn(dashboardStyles.card, dashboardStyles.calendarGrid, "flex flex-col")}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
      <div className="flex items-center gap-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-7 w-12 rounded-lg" /></div>
      <div className="flex h-8 items-center gap-1 px-2"><Skeleton className="resident-dashboard-calendar-action-label h-3 w-20" /><Skeleton className="h-3.5 w-3.5" /></div>
    </div>
    <div className="mb-2 grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }).map((_, index) => <div key={index} className="py-1"><Skeleton className="mx-auto h-4 w-6" /></div>)}
    </div>
    <div className={dashboardStyles.calendarDays}>
      {Array.from({ length: dayCount }).map((_, index) => (
        <div key={index} className="resident-dashboard-calendar-day aspect-square rounded-xl border border-border/60 p-1 sm:aspect-auto sm:p-2">
          {index >= firstDayIndex && <Skeleton className="h-5 w-5 rounded-full" />}
        </div>
      ))}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-36 max-w-[50%]" /></div>
  </div>
);

export const ResidentDashboardSkeleton = ({ dayCount, firstDayIndex }: { dayCount: number; firstDayIndex: number }) => (
  <div role="status" aria-label="Loading resident dashboard" className={dashboardStyles.page}>
    <ResidentPageHeaderSkeleton
      className={dashboardStyles.greeting}
      titleClassName="w-64"
      titleBadge={<Skeleton className="h-6 w-24 rounded-md" />}
      actionsClassName={dashboardStyles.greetingActions}
      actions={<>
        <div className={dashboardStyles.dateBadge}>
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </>}
    />

    <div className={dashboardStyles.overview}>
      {[dashboardStyles.collectionColumn, dashboardStyles.truckColumn, dashboardStyles.reportColumn].map((column, index) => (
        <ResidentDashboardCardSkeleton key={index} className={column} />
      ))}
    </div>

    <div className={dashboardStyles.updates}>
      <ResidentDashboardUpdateSkeleton post />
      <ResidentDashboardUpdateSkeleton />
    </div>

    <div className={dashboardStyles.supporting}>
      <div className={dashboardStyles.calendarColumn}><ResidentDashboardCalendarSkeleton dayCount={dayCount} firstDayIndex={firstDayIndex} /></div>

      <div className={dashboardStyles.supportColumn}>
        <div className="flex h-full min-h-[180px] flex-col justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/[0.05] p-4 sm:p-5">
          <Skeleton className="h-4 w-32" />
          <div className="min-h-[4.5rem] space-y-2"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>
          <Skeleton className="h-1 w-10" />
        </div>
        <div className={cn(dashboardStyles.card, "flex flex-col overflow-hidden")}>
          <div className="space-y-2 p-4 pb-3 sm:p-5 sm:pb-3"><Skeleton className="h-5 w-40 max-w-full" /><Skeleton className="h-3 w-36 max-w-full" /></div>
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:px-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-w-0 items-start gap-2.5"><Skeleton className="size-4 shrink-0" /><div className="min-w-0 flex-1 space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className={cn(index === 3 ? "h-8 w-5/6" : "h-4 w-3/4", "max-w-full")} /></div></div>
            ))}
          </div>
          <div className="mt-auto border-t border-border/50 px-4 py-3 sm:px-5"><Skeleton className="h-9 w-full rounded-lg" /></div>
        </div>
      </div>
    </div>
  </div>
);


/* ─── Resident Community Updates Skeletons ─── */
export const ContentCardsSkeleton = ({ count = 6 }: { count?: number }) => (
  <div role="status" aria-label="Loading community updates" className={contentStyles.grid}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className={contentStyles.cardImage}>
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>
        <div className={contentStyles.cardContent}>
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <div className={contentStyles.cardFooter}>
            <div className={contentStyles.cardMetadata}>
              <Skeleton className="h-3.5 w-24 max-w-full" />
              <Skeleton className="h-3.5 w-20 max-w-full" />
            </div>
            <Skeleton className={cn(contentStyles.reactionSize, "w-10 rounded-lg")} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ResidentContentsSkeleton = () => (
  <div role="status" aria-label="Loading Community Posts" className={contentStyles.page}>
    <ResidentPageHeaderSkeleton titleClassName="w-56" descriptionClassName="w-96" />
    <div className={contentStyles.stack}>
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className={contentStyles.filterRow}>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
          {["w-11", "w-20", "w-16"].map((width, index) => <Skeleton key={index} className={`h-9 shrink-0 ${width} rounded-lg`} />)}
        </div>
        <Skeleton className={cn(contentStyles.sort, "h-9 rounded-lg")} />
      </div>
    </div>
    <div className={contentStyles.featuredCard}>
      <div className={contentStyles.featuredGrid}>
        <div className={contentStyles.featuredDetails}>
          <div className="space-y-4">
            <div className="flex gap-2"><Skeleton className="h-5 w-20 rounded-md" /><Skeleton className="h-5 w-24 rounded-md" /></div>
            <div className={cn(contentStyles.featuredTitle, "space-y-2")}>
              <Skeleton className="w-full [height:1em]" />
              <Skeleton className="w-3/4 [height:1em]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32 max-w-full" />
            </div>
          </div>
          <div className={contentStyles.featuredFooter}>
            <Skeleton className="community-content-read-placeholder h-11 shrink-0 rounded-lg" />
          </div>
        </div>
        <div className={contentStyles.featuredMedia}>
          <Skeleton className={cn(contentStyles.featuredImage, "rounded-none bg-muted")} />
        </div>
      </div>
      <div className={contentStyles.featuredPagination}>
        {[0, 1, 2].map((index) => <div key={index} className={`${contentStyles.carouselDotButton} ${index === 0 ? "w-5" : "w-2"}`}><Skeleton className={`h-1 rounded-full ${index === 0 ? "w-4" : "w-1"}`} /></div>)}
      </div>
    </div>
    <section className="space-y-4">
      <div className={contentStyles.sectionHeading}>
        <Skeleton className="h-5 w-44 max-w-full sm:h-6" />
      </div>
      <ContentCardsSkeleton />
    </section>
    </div>
  </div>
);


/* ─── Resident Collection Tracking Skeleton ─── */
const TrackingTextSkeleton = ({ className, children }: { className?: string; children: string }) => (
  <Skeleton aria-hidden="true" className={cn("resident-tracking-skeleton-text", className)}>
    <span className="invisible">{children}</span>
  </Skeleton>
);

export const ResidentTrackingSkeleton = ({ residentArea }: { residentArea?: string } = {}) => (
  <div role="status" aria-label="Loading live collection tracking" className={trackingStyles.page}>
    <ResidentPageHeaderSkeleton />
    <div className={trackingStyles.stack}>
      <div className={trackingStyles.schedule}>
        <div className={trackingStyles.scheduleDetails}>
          <div className={trackingStyles.scheduleHeading}>
            <TrackingTextSkeleton className={trackingStyles.scheduleTitle}>
              {`Collection for ${residentArea || "Your Location"}`}
            </TrackingTextSkeleton>
            <Skeleton aria-hidden="true" className={`${trackingStyles.scheduleBadge} border-transparent`}>
              <span className="invisible">Non-biodegradable</span>
            </Skeleton>
          </div>
          <div className={trackingStyles.scheduleMeta}>
            <div className="flex min-w-0 items-start gap-2">
              <Skeleton className="h-3.5 w-3.5 shrink-0" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <Skeleton className="h-3.5 w-3.5 shrink-0" />
              <Skeleton className="h-4 w-28 max-w-full" />
            </div>
          </div>
        </div>
        <div className={trackingStyles.reminder}>
          <Skeleton className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <TrackingTextSkeleton>Please have segregated bins ready</TrackingTextSkeleton>
        </div>
      </div>
      <div className={trackingStyles.mapHeight}>
        <div className={trackingStyles.mapShell}>
          <div className={trackingStyles.mapCanvas}>
            <Skeleton className="h-full w-full rounded-none" />
            <div className={trackingStyles.zoom}>
              <div className={trackingStyles.zoomButton}><Skeleton className="h-3.5 w-3.5" /></div>
              <div className="mx-1 h-px bg-border/60" />
              <div className={trackingStyles.zoomButton}><Skeleton className="h-3.5 w-3.5" /></div>
            </div>
          </div>
          <div className={trackingStyles.mapStatus}>
            <div className={`${trackingStyles.statusCard} !shadow-none`}>
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <TrackingTextSkeleton className={trackingStyles.statusHeading}>
                    {scheduledTrackingContent.title}
                  </TrackingTextSkeleton>
                  <TrackingTextSkeleton className="w-fit max-w-full text-ui-overline font-medium">
                    {scheduledTrackingContent.badge}
                  </TrackingTextSkeleton>
                </div>
              </div>
              <div className="resident-tracking-status-divider">
                <TrackingTextSkeleton className={trackingStyles.statusDescription}>
                  {scheduledTrackingContent.description}
                </TrackingTextSkeleton>
              </div>
            </div>
          </div>
          <div className={trackingStyles.mapFooter}>
            <div className={trackingStyles.legend}>
              {["Current", "Done", "Upcoming"].map((label) => (
                <span key={label} className="flex items-center gap-1">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <TrackingTextSkeleton>{label}</TrackingTextSkeleton>
                </span>
              ))}
            </div>
            <div className={trackingStyles.actions}>
              {["My Area", "Fit Route"].map((label) => (
                <div key={label} className={trackingStyles.actionButton}>
                  <Skeleton className="h-3.5 w-3.5 shrink-0" />
                  <TrackingTextSkeleton className="resident-tracking-action-label">{label}</TrackingTextSkeleton>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
