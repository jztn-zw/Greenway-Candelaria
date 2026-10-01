import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getManilaNow } from "@/utils/date";
import ProfileBannerImage from "@/components/common/ProfileBannerImage";

/* ─── Admin Dashboard Skeletons ─── */

export const KPICardsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className={cn(
        "min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-2.5",
        i % 2 === 0 && "border-r border-border/70",
        i < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
        i < 2 && "border-b lg:border-b-0 border-border/70",
      )}>
        <div className="flex items-center min-h-[22px]">
          <Skeleton className="h-5 w-28 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-8 sm:h-9 w-20 max-w-full" />
        <Skeleton className="h-4 w-36 max-w-full" />
      </div>
    ))}
  </div>
);

export const TrendChartsSkeleton = () => (
  <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="min-w-0 bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className={cn("flex items-center justify-between gap-3", i === 1 ? "pb-2" : "pb-3")}>
          <div className="min-w-0 space-y-1">
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="h-4 w-28 max-w-full" />
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
        ) : <Skeleton className="h-[185px] w-full rounded-xl" />}
      </div>
    ))}
  </div>
);

export const OperationsAndAttentionSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
    <div className="min-w-0 bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
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
      <Skeleton className="mt-3 h-11 w-full rounded-xl" />
    </div>
    <div className="relative min-w-0 min-h-[380px] bg-card border border-border/80 rounded-2xl shadow-2xs">
      <div className="absolute inset-4 sm:inset-6 flex min-h-0 flex-col">
      <DashboardSectionHeaderSkeleton badge />
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
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
  <div className="min-w-0 h-full bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs lg:col-span-2">
    <DashboardSectionHeaderSkeleton />
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-muted/20">
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
  <div className="min-w-0 h-full bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs lg:col-span-1">
    <DashboardSectionHeaderSkeleton />
    <div className="h-[275px] sm:h-[315px] overflow-hidden pr-3 space-y-3">
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
  const date = new Date(`${asOfDate || new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  const firstDayIndex = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1).getDay();
  const daysInMonth = new Date(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getDate();

  return (
    <div role="status" aria-busy="true" aria-label="Loading schedule" className={cn("bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs", className)}>
      <span className="sr-only">Loading schedule…</span>
      <div aria-hidden="true">
        <DashboardSectionHeaderSkeleton />
        <div className="grid grid-cols-7 gap-1 pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="py-1 flex justify-center"><Skeleton className="h-4 w-7" /></div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-h-0">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`offset-${i}`} className="aspect-square min-h-0 sm:aspect-auto sm:min-h-[95px] rounded-xl bg-muted/20 border border-transparent opacity-30" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => (
            <div key={i} className="aspect-square min-h-0 p-1 sm:aspect-auto sm:p-2 sm:min-h-[95px] rounded-xl border border-border/60 flex flex-col justify-between">
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
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
    <div className="min-h-8 flex items-center min-w-0">
      <Skeleton className="h-5 sm:h-6 w-44 max-w-full" />
    </div>
    <Skeleton className={badge ? "h-6 w-16 rounded-md" : "h-8 w-24 rounded-xl"} />
  </div>
);

export const BannerSkeleton = () => (
  <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-border bg-card shadow-sm">
    <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
  </div>
);

/* ─── Collector Full Dashboard Skeleton ─── */
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
  <div role="status" aria-busy="true" className="mx-auto w-full max-w-[1600px] space-y-4 pb-8 sm:space-y-5">
    <span className="sr-only">Loading collector dashboard…</span>
    <div aria-hidden="true" className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs sm:p-4 md:p-5">
      <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-7 w-48 sm:h-8 sm:w-56" /><Skeleton className="h-5 w-20 rounded-lg" /></div>
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0"><Skeleton className="h-7 w-36 rounded-lg sm:h-8" /><Skeleton className="h-7 w-28 rounded-lg sm:h-8" /></div>
      </div>
    </div>

    <div aria-hidden="true" className="grid grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex min-w-0 flex-col justify-between gap-2 p-2.5 sm:gap-3 sm:p-4 md:p-5">
          <div className="flex items-center justify-between gap-1"><Skeleton className="h-5 w-20 max-w-[70%] rounded-md" /><Skeleton className="size-5 shrink-0 rounded-lg sm:size-7" /></div>
          <div className="space-y-1"><Skeleton className="h-7 w-16 max-w-full sm:h-8" /><Skeleton className="h-3 w-20 max-w-full" /></div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-2">
      <div aria-hidden="true" className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs sm:min-h-[380px] lg:min-h-[355px]">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5"><Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-20 rounded-md" /></div>
        <div className="flex flex-1 flex-col justify-between space-y-4 p-4 sm:p-5">
          <div className="space-y-4">
            <div className="space-y-2"><div className="flex justify-between gap-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-5 w-24 rounded-md" /></div><Skeleton className="h-3 w-48 max-w-full" /></div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-48 max-w-full" /></div><Skeleton className="h-7 w-16 rounded-lg" /></div>
            <div className="space-y-2"><Skeleton className="h-3 w-40" /><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-11 rounded-xl" />)}</div></div>
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
      <div className="min-h-[360px] sm:min-h-[380px] lg:min-h-[355px]"><CollectorCalendarCardSkeleton /></div>
    </div>

    <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2">
      <div aria-hidden="true" className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5"><Skeleton className="h-4 w-44 max-w-[70%]" /><Skeleton className="h-3 w-14" /></div>
        <div className="divide-y divide-border/50">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-32 max-w-full" /></div><Skeleton className="h-5 w-12" /></div>)}</div>
      </div>
      <div aria-hidden="true" className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between border-b border-border/50 pb-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-24 rounded-md" /></div>
        <div className="my-auto grid grid-cols-3 gap-1.5 py-2 sm:gap-2.5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-2 sm:p-3"><Skeleton className="h-3 w-16 max-w-full" /><Skeleton className="h-4 w-20 max-w-full" /><Skeleton className="h-3 w-14 max-w-full" /></div>)}</div>
        <div className="flex items-center justify-between border-t border-border/50 pt-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-36 rounded-xl" /></div>
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
  <div role="status" aria-busy="true" className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
    <span className="sr-only">Loading schedule…</span>
    <div aria-hidden="true"><Skeleton className="h-8 w-64 max-w-full sm:h-9" /><Skeleton className="mt-1 h-4 w-[700px] max-w-full sm:h-5" /></div>
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
      <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-6 lg:col-span-2 lg:h-[620px]">
        <div aria-hidden="true" className="mb-3 flex shrink-0 items-center justify-between border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
          <div className="flex items-center gap-2"><Skeleton className="h-5 w-40 max-w-full" /><Skeleton className="h-7 w-14 rounded-lg" /></div>
          <div className="flex gap-1"><Skeleton className="size-8 rounded-lg" /><Skeleton className="size-8 rounded-lg" /></div>
        </div>
        <div aria-hidden="true" className="grid shrink-0 grid-cols-7 gap-1 pb-2">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="mx-auto my-1 h-3 w-7 max-w-full" />)}</div>
        <CalendarMonthGridSkeleton currentDate={currentDate} />
      </div>
      <aside className="flex min-h-[340px] max-h-[480px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6 lg:h-[620px] lg:max-h-none">
        <div aria-hidden="true" className="mb-3.5 shrink-0 space-y-1 border-b border-border/60 pb-3.5"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-44" /></div>
        <SelectedDayEventsSkeleton />
      </aside>
    </div>
  </div>
);

/* ─── Collector Route History Skeletons ─── */
export const CollectorRouteHistoryRowsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div role="status" aria-busy="true" className="space-y-3">
    <span className="sr-only">Loading route history…</span>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} aria-hidden="true" className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-[4px] border-muted"><Skeleton className="h-2.5 w-5" /></div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-6 w-36 max-w-full" /><Skeleton className="h-[26px] w-24 max-w-full rounded-lg" /><Skeleton className="h-[26px] w-32 max-w-full rounded-lg" /></div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {["w-44", "w-40", "w-24", "w-16"].map((width) => <Skeleton key={width} className={cn("h-4 max-w-full sm:h-5", width)} />)}
            </div>
          </div>
        </div>
        <Skeleton className="size-9 shrink-0 rounded-xl" />
      </div>
    ))}
  </div>
);

export const CollectorRouteHistorySkeleton = () => (
  <div role="status" aria-busy="true" className="mx-auto w-full max-w-[1200px] space-y-4 pb-8 sm:space-y-5">
    <span className="sr-only">Loading route history…</span>
    <div aria-hidden="true" className="pb-1"><Skeleton className="h-8 w-56 max-w-full sm:h-9" /><Skeleton className="mt-1 h-6 w-[440px] max-w-full" /></div>
    <div aria-hidden="true" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">{[128, 114, 78, 132].map((width) => <Skeleton key={width} className="h-10 rounded-xl" style={{ width }} />)}</div>
      <Skeleton className="h-10 w-full shrink-0 rounded-xl sm:w-[190px]" />
    </div>
    <CollectorRouteHistoryRowsSkeleton />
  </div>
);

export const CollectorRouteHistoryDetailSkeleton = () => (
  <div role="status" aria-busy="true" className="mx-auto w-full max-w-[1200px] space-y-4 pb-8 sm:space-y-5">
    <span className="sr-only">Loading route details…</span>
    <div aria-hidden="true" className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
      <div className="space-y-1.5 border-b border-border/60 pb-3.5">
        <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-7 w-44 max-w-full" /><Skeleton className="h-[26px] w-24 rounded-lg" /><Skeleton className="h-[26px] w-32 rounded-lg" /></div>
        <Skeleton className="h-4 w-[440px] max-w-full sm:h-5" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex flex-col justify-between rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-3.5"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="mt-1 h-7 w-20" /></div>)}
      </div>
    </div>
    <div aria-hidden="true" className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1"><div className="flex items-center gap-2"><Skeleton className="size-4" /><Skeleton className="h-5 w-36 max-w-full" /></div><Skeleton className="h-[26px] w-24 rounded-lg" /></div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex items-start gap-3.5 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs sm:p-4"><Skeleton className="mt-0.5 size-8 shrink-0 rounded-lg" /><div className="min-w-0 flex-1 space-y-1"><div className="flex items-center justify-between gap-2"><Skeleton className="h-5 w-40 max-w-full" /><Skeleton className="h-6 w-20 shrink-0 rounded-lg" /></div><Skeleton className="h-4 w-24" /></div></div>)}
      </div>
    </div>
  </div>
);

/* ─── Collector Profile Skeleton ─── */
export const CollectorProfileSkeleton = () => (
  <div role="status" aria-busy="true" className="mx-auto w-full max-w-3xl space-y-4 pb-8 sm:space-y-5">
    <span className="sr-only">Loading collector profile…</span>
    <div aria-hidden="true" className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
      <div className="relative h-28 border-b border-border/50 bg-muted/40 lg:h-36">
        <Skeleton className="absolute right-3.5 top-3.5 h-8 w-36 rounded-md lg:right-4 lg:top-4" />
      </div>
      <div className="relative px-4 pb-5 pt-0 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
        <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="size-20 rounded-full ring-4 ring-background lg:size-28" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-col justify-center gap-1.5 md:flex-row md:items-center md:justify-start md:gap-3">
              <Skeleton className="h-7 w-48 max-w-full lg:h-8" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:justify-start">
              <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div aria-hidden="true" className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0"><Skeleton className="h-5 w-36 max-w-full" /><Skeleton className="h-4 w-44 max-w-full" /></div>
        </div>
        <Skeleton className="h-[26px] w-32 shrink-0 rounded-lg" />
      </div>
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => <div key={index} className="space-y-1 rounded-xl border border-border/60 bg-muted/40 p-3.5"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-6 w-28 max-w-full sm:h-7" /></div>)}
        </div>
        <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row"><Skeleton className="h-4 w-72 max-w-full" /><Skeleton className="h-9 w-full shrink-0 rounded-xl sm:w-40" /></div>
      </div>
    </div>

    <div aria-hidden="true" className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:space-y-4 md:p-5 lg:p-6">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex min-w-0 items-center gap-2.5"><Skeleton className="size-8 shrink-0 rounded-lg" /><div className="min-w-0"><Skeleton className="h-5 w-36 max-w-full" /><Skeleton className="h-4 w-72 max-w-full" /></div></div>
        <Skeleton className="hidden h-4 w-24 shrink-0 md:block" />
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="-mx-2 flex items-center justify-between gap-3 px-2 py-2.5 md:-mx-4 md:px-4 md:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-3.5"><Skeleton className="size-9 shrink-0 rounded-xl lg:size-10" /><div className="min-w-0"><Skeleton className="h-4 w-20 max-w-full" /><Skeleton className="mt-0.5 h-5 w-36 max-w-full" /></div></div>
            <Skeleton className={cn("h-8 shrink-0", index === 2 ? "w-36 rounded-lg" : index === 4 ? "w-20 rounded-xl" : "w-14 rounded-xl")} />
          </div>
        ))}
      </div>
    </div>

    <div aria-hidden="true" className="space-y-3 pb-8">
      <div className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs lg:p-4.5">
        <div className="flex min-w-0 items-center gap-3.5"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0"><Skeleton className="h-5 w-16" /><Skeleton className="mt-0.5 h-4 w-60 max-w-full" /></div></div>
        <Skeleton className="size-4 shrink-0 lg:h-4 lg:w-20" />
      </div>
      <div className="flex items-center justify-center gap-1.5 pt-1"><Skeleton className="size-3.5 shrink-0" /><Skeleton className="h-4 w-[420px] max-w-full" /></div>
    </div>
  </div>
);

/* ─── Collector Route Map Skeleton ─── */
export const CollectorRouteMapSkeleton = () => (
  <div role="status" aria-busy="true" className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-4 sm:space-y-4 sm:px-0">
    <span className="sr-only">Loading collection route…</span>
    <div aria-hidden="true" className="pb-1">
      <Skeleton className="h-8 w-64 max-w-full sm:h-9" />
      <Skeleton className="mt-1 h-4 w-80 max-w-full" />
    </div>

    <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-xs sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-6 w-28 rounded-lg" /><Skeleton className="h-6 w-20 rounded-lg" /></div>
      <Skeleton className="h-7 w-28 rounded-lg" />
    </div>

    <div aria-hidden="true" className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 space-y-2"><Skeleton className="h-5 w-52 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /><Skeleton className="h-4 w-48 max-w-full" /></div>
      </div>
      <Skeleton className="h-12 w-full shrink-0 rounded-xl sm:w-48" />
    </div>

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
      <section aria-label="Loading planned route map" className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="space-y-1.5"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-52 max-w-full" /></div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <div aria-hidden="true" className="h-[320px] bg-muted/25 sm:h-[420px] lg:h-[520px]" />
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
  <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div className="min-w-0">
        <Skeleton className="h-8 lg:h-9 w-72 sm:w-96 max-w-full" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-3 lg:w-auto lg:shrink-0 lg:border-t-0 lg:pt-0">
        <Skeleton className="h-9 sm:h-10 w-40 rounded-xl" />
        <Skeleton className="h-9 sm:h-10 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);

/* ─── Generic Page Header Skeleton (icon + title + subtitle) ─── */
export const PageHeaderSkeleton = ({ showButton = true }: { showButton?: boolean }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      {showButton && <Skeleton className="h-9 w-36 rounded-md" />}
    </div>
  </div>
);

/* ─── Generic KPI Row Skeleton ─── */
export const KPIRowSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${Math.min(count, 4)}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center gap-4">
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Generic Toolbar Skeleton (search + filters) ─── */
export const ToolbarSkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex flex-col lg:flex-row gap-3">
      <Skeleton className="h-10 flex-1 rounded-md" />
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-[140px] rounded-md" />
        <Skeleton className="h-10 w-[120px] rounded-md" />
        <Skeleton className="h-10 w-[120px] rounded-md" />
      </div>
    </div>
  </div>
);

/* ─── Generic Table Skeleton ─── */
export const TableSkeleton = ({ cols = 6, rows = 8 }: { cols?: number; rows?: number }) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="p-4 space-y-3">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4 py-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ─── Card Grid Skeleton ─── */
export const CardGridSkeleton = ({ count = 6, cols = 3 }: { count?: number; cols?: number }) => (
  <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-${cols}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    ))}
  </div>
);

/* ─── Map + Side Panel Skeleton ─── */
export const MapPanelSkeleton = () => (
  <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
    <div className="lg:col-span-2 h-[420px] lg:h-[520px]">
      <Skeleton className="w-full h-full rounded-xl" />
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Profile Page Skeleton (Resident) ─── */
export const ProfileSkeleton = () => (
  <div role="status" aria-label="Loading resident profile" className="mx-auto max-w-3xl space-y-5 md:space-y-6">
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
      <div className="relative h-28 overflow-hidden border-b border-border/50 bg-muted/50 lg:h-36">
        <ProfileBannerImage />
        <Skeleton className="absolute right-3.5 top-3.5 h-8 w-32 rounded-md lg:right-4 lg:top-4" />
      </div>
      <div className="relative px-4 pb-5 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
        <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="size-20 rounded-full ring-4 ring-background lg:size-28" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-col items-center gap-1.5 md:flex-row md:gap-3"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="h-6 w-28 rounded-md" /></div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-32" /></div>
          </div>
        </div>
      </div>
    </div>

    <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:p-5 lg:p-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2.5"><Skeleton className="size-8 rounded-lg" /><div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div>
        <Skeleton className="hidden h-3 w-28 md:block" />
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center justify-between gap-3 px-2 py-2.5 md:px-4 md:py-3"><div className="flex min-w-0 flex-1 items-center gap-3"><Skeleton className="size-9 shrink-0 rounded-xl lg:size-10" /><div className="space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-40 max-w-full" /></div></div><Skeleton className="h-8 w-16 shrink-0 rounded-xl" /></div>)}
      </div>
    </section>

    <section className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs lg:p-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-2"><div className="flex items-center gap-2.5"><Skeleton className="size-8 rounded-lg" /><div className="space-y-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div><Skeleton className="h-8 w-32 rounded-xl" /></div>
      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/40 p-4"><div className="flex justify-between"><Skeleton className="h-4 w-44" /><Skeleton className="h-5 w-24 rounded-md" /></div><Skeleton className="h-2.5 w-full rounded-full" /><Skeleton className="h-3 w-3/4" /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3 text-center sm:p-4"><Skeleton className="mx-auto h-8 w-12" /><Skeleton className="mx-auto h-3 w-20 max-w-full" /></div>)}</div>
    </section>

    <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs lg:p-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-2"><div className="flex items-center gap-2.5"><Skeleton className="size-8 rounded-lg" /><div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /></div></div><Skeleton className="h-6 w-24 rounded-md" /></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-start gap-3.5 rounded-xl border border-border/80 bg-muted/15 p-3.5 lg:p-4"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-3 w-44 max-w-full" /></div></div>)}</div>
    </section>

    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs"><div className="flex items-center justify-between"><div className="flex items-center gap-3.5"><Skeleton className="size-10 rounded-xl" /><div className="space-y-1"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-52 max-w-full" /></div></div><Skeleton className="size-4" /></div></div>
  </div>
);

/* ─── Admin Profile Skeleton ─── */
export const AdminProfileSkeleton = () => (
  <div role="status" aria-busy="true" className="mx-auto max-w-3xl space-y-5 md:space-y-6">
    <span className="sr-only">Loading administrator profile…</span>
    <div aria-hidden="true" className="space-y-5 md:space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="relative h-28 border-b border-border/50 bg-muted/50 lg:h-36">
          <Skeleton className="absolute right-3.5 top-3.5 h-8 w-40 rounded-md lg:right-4 lg:top-4" />
        </div>
        <div className="relative px-4 pb-5 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
          <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Skeleton className="size-20 rounded-full ring-4 ring-background lg:size-28" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-col items-center gap-1.5 md:flex-row md:gap-3"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="h-6 w-28 rounded-md" /></div>
              <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-32" /></div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:p-5 lg:p-6">
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-2"><Skeleton className="size-8 rounded-lg" /><div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-2 py-2.5 md:px-4 md:py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-3.5"><Skeleton className="size-9 shrink-0 rounded-xl lg:size-10" /><div className="min-w-0 space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-40 max-w-full" /></div></div>
              <Skeleton className="h-8 w-16 shrink-0 rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:p-5 lg:p-6">
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-2"><Skeleton className="size-8 rounded-lg" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3.5 w-56" /></div></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5"><Skeleton className="size-4 rounded" /><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-28 max-w-full" /></div>)}
        </div>
      </section>

      <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><div className="space-y-1"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-36" /></div></div><Skeleton className="size-4" /></div>
    </div>
  </div>
);

/* ─── Resident Settings Page Skeleton (1:1 with ResidentSettings.tsx) ─── */
export const SettingsSkeleton = () => (
  <div role="status" aria-label="Loading resident settings" className="mx-auto max-w-3xl space-y-4 md:space-y-5 lg:space-y-6">
    <div className="hidden space-y-2 md:block"><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-96 max-w-full" /></div>
    {[1, 3, 1, 2, 2].map((rowCount, sectionIndex) => (
      <section key={sectionIndex} className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 md:space-y-4 md:p-5 lg:p-6">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-2.5 lg:gap-3 lg:pb-3">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div>
        </div>
        {sectionIndex === 2 ? (
          <div className="space-y-2"><div className="flex items-center justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-28" /></div><div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border/60 bg-muted/40 p-1"><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" /></div></div>
        ) : Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-between gap-3 border-b border-border/40 px-2 py-2.5 last:border-b-0 lg:px-2.5 lg:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {(sectionIndex === 0 || sectionIndex >= 3) && <Skeleton className="size-9 shrink-0 rounded-xl" />}
              <div className="min-w-0 space-y-1.5"><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div>
            </div>
            <Skeleton className={sectionIndex <= 1 ? "h-6 w-11 shrink-0 rounded-full" : "size-4 shrink-0"} />
          </div>
        ))}
      </section>
    ))}
    <Skeleton className="mx-auto h-3 w-80 max-w-full" />
  </div>
);

/* ─── Admin Alert Settings Skeleton ─── */
export const AdminAlertSettingsSkeleton = () => (
  <div role="status" aria-busy="true" className="space-y-1">
    <span className="sr-only">Loading admin alert preferences…</span>
    <div aria-hidden="true" className="space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 border-b border-border/40 px-2 py-2.5 last:border-b-0 lg:px-2.5 lg:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="space-y-1"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-72 max-w-full" /></div>
          </div>
          <Skeleton className="h-6 w-11 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Admin Schedule Manager Skeleton ─── */
export const AdminScheduleSkeleton = ({ currentDate }: { currentDate: Date }) => {
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  return (
    <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-12">
      <span className="sr-only">Loading internal schedules…</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 sm:h-9 w-64 max-w-full" />
            <Skeleton className="mt-0.5 h-4 sm:h-5 w-[620px] max-w-full" />
          </div>
          <Skeleton className="h-10 w-44 shrink-0 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(
              "flex min-w-0 flex-col justify-between space-y-2.5 p-4 sm:p-5",
              i % 2 === 0 && "border-r border-border/70",
              i < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
              i < 2 && "border-b border-border/70 lg:border-b-0",
            )}>
              <div className="flex min-h-[22px] items-center"><Skeleton className="h-5 w-28 rounded-md" /></div>
              <Skeleton className="h-8 sm:h-9 w-16" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
            <Skeleton className="h-10 w-full rounded-xl sm:max-w-xs md:max-w-sm" />
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-6 lg:col-span-2 lg:flex lg:h-[620px] lg:flex-col">
            <div className="mb-3 flex shrink-0 items-center justify-between border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-7 w-14 rounded-lg" />
              </div>
              <div className="flex gap-1"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
            </div>
            <div className="grid shrink-0 grid-cols-7 gap-1 pb-2 text-center">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="mx-auto my-1 h-3 w-7 max-w-full" />)}
            </div>
            <div className="grid min-h-0 grid-cols-7 gap-1 sm:flex-1 sm:auto-rows-fr sm:gap-1.5">
              {Array.from({ length: firstDayIndex + daysInMonth }).map((_, i) => (
                i < firstDayIndex ? (
                  <div key={i} className="aspect-square rounded-xl border border-transparent bg-muted/20 opacity-30 sm:aspect-auto sm:h-full" />
                ) : (
                  <div key={i} className="flex aspect-square flex-col justify-between rounded-xl border border-border/60 p-1 sm:aspect-auto sm:h-full sm:p-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="mx-auto h-2 w-2 rounded-full" />
                  </div>
                )
              ))}
            </div>
          </div>

          <div className="flex min-h-[340px] max-h-[480px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6 lg:col-span-1 lg:h-[620px] lg:max-h-none">
            <div className="mb-3.5 shrink-0 space-y-1 border-b border-border/60 pb-3.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2.5 rounded-xl border border-border/80 bg-background p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2"><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-7 w-7 rounded-lg" /></div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Shared resident, collector, and admin notification feed ─── */
export const NotificationsListSkeleton = () => (
  <div role="status" aria-label="Loading notifications" className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs divide-y divide-border/60">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3.5 md:gap-4 md:p-4 lg:p-5">
        <Skeleton className="mt-0.5 h-10 w-10 shrink-0 rounded-xl lg:h-11 lg:w-11" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className={cn("h-4 max-w-full", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
          <Skeleton className="h-3 w-4/5 max-w-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="hidden h-2.5 w-2.5 shrink-0 self-center rounded-full sm:block" />
        <Skeleton className="h-4 w-4 shrink-0 self-center rounded-md" />
      </div>
    ))}
  </div>
);

export const NotificationsPageSkeleton = ({ role = "resident" }: { role?: "resident" | "collector" | "admin" }) => {
  const tabWidths = role === "collector" ? [44, 110, 112, 114] : role === "admin" ? [44, 94, 76, 78, 114] : [44, 88, 74, 78, 114];
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 md:space-y-5 animate-in fade-in duration-300">
      <div className="hidden items-center justify-between gap-4 lg:flex">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-4 w-[420px] max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden pb-0.5 pr-2 lg:pr-4">
          {tabWidths.map((width, i) => <Skeleton key={i} className="h-9 shrink-0 rounded-xl" style={{ width }} />)}
        </div>
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl lg:hidden" />
      </div>
      <NotificationsListSkeleton />
    </div>
  );
};

/* ─── Resident Schedule Page Skeleton (1:1 with ResidentSchedule.tsx) ─── */
export const ResidentScheduleSkeleton = () => (
  <div role="status" aria-label="Loading resident calendar" className="mx-auto w-full max-w-[1400px] space-y-4 pb-8 md:space-y-5 md:pb-10 lg:pb-12">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
      <div className="hidden space-y-2 md:block"><Skeleton className="h-8 w-60" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="flex w-full gap-1 rounded-xl border border-border/80 bg-card p-1 lg:w-auto">
        <Skeleton className="h-9 min-w-0 flex-1 rounded-lg lg:w-40" />
        <Skeleton className="h-9 min-w-0 flex-1 rounded-lg lg:w-32" />
      </div>
    </div>

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
export const MyReportsListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div role="status" aria-label="Loading reports" className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="space-y-2.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs md:space-y-3 md:p-4.5 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
        <Skeleton className="hidden h-3 w-4/5 lg:block" />
        <div className="flex items-center justify-between gap-3 pt-0.5 lg:pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-3 w-16 md:block" />
        </div>
      </div>
    ))}
  </div>
);

export const MyReportsPageSkeleton = () => (
  <div role="status" aria-label="Loading My Reports" className="space-y-4 md:space-y-5 lg:space-y-6">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl md:w-44" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {["w-16", "w-24", "w-32", "w-24", "w-20"].map((width, index) => (
            <Skeleton key={index} className={cn("h-9 shrink-0 rounded-xl", width)} />
          ))}
        </div>
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl md:w-32" />
      </div>
    </div>
    <MyReportsListSkeleton />
  </div>
);

type MyReportDetailSkeletonPreview = {
  photoCount?: number;
  status?: string;
  statusHistory?: unknown[];
  adminResponse?: string;
  description?: string;
};

export const MyReportDetailSkeleton = ({ preview }: { preview?: MyReportDetailSkeletonPreview }) => {
  // When the list has loaded, match this report's photo count. A direct link has
  // no preview yet, so show the five available photo slots until detail arrives.
  const photoCount = Math.min(Math.max(preview?.photoCount ?? 5, 0), 5);
  const milestoneCount = Math.min(Math.max(preview?.statusHistory?.length ?? 1, 1), 4);
  const descriptionLines = preview?.description
    ? Math.min(Math.max(Math.ceil(preview.description.length / 75), 1), 3)
    : 2;
  const showAction = !preview || preview.status === "submitted" || preview.status === "resolved";

  return (
  <div role="status" aria-busy="true" aria-label="Loading report details" className="mx-auto max-w-3xl space-y-0 pb-4 md:space-y-4 md:pb-6 lg:space-y-5 lg:pb-8">
    <div className="divide-y divide-border/60 md:overflow-hidden md:rounded-2xl md:border md:border-border/80 md:bg-card md:shadow-2xs">
      <div className="space-y-2.5 py-4 md:space-y-3 md:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">Reference Number</p>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-40 lg:h-8" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-6 w-24 shrink-0 rounded-md lg:h-7" />
        </div>
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="space-y-3.5 py-4 md:space-y-4 md:p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {["Violation Type", "Reported Location"].map((label) => (
            <div key={label} className="space-y-1.5">
              <p className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 dark:bg-muted/20 lg:gap-3.5 lg:p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 pt-1.5 md:pt-2">
          <p className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">Incident Description</p>
          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3 dark:bg-muted/20 md:p-4">
            {Array.from({ length: descriptionLines }).map((_, index) => (
              <Skeleton key={index} className={cn("h-4", index === descriptionLines - 1 ? "w-5/6" : "w-full")} />
            ))}
          </div>
        </div>
      </div>

      {photoCount > 0 && (
        <div className="space-y-2.5 py-4 md:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">Photo Evidence</p>
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-start gap-3 overflow-hidden pb-1">
            {Array.from({ length: photoCount }).map((_, index) => (
              <Skeleton key={index} className="size-12 shrink-0 rounded-xl md:size-16 lg:size-20" />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 py-4 md:p-5 lg:space-y-5 lg:p-6">
        <div>
          <p className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">Review &amp; Dispatch Status</p>
          <div className="mt-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-2 flex-1 rounded-full" />)}
            </div>
            <div className="grid grid-cols-4 text-center text-ui-overline text-muted-foreground md:text-xs">
              {["Submitted", "Under Review", "Dispatched", "Resolved"].map((label) => <span key={label}>{label}</span>)}
            </div>
          </div>
        </div>
          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">Activity Milestones</p>
            {Array.from({ length: milestoneCount }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 pl-1">
                <Skeleton className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />
                <div className="space-y-1.5 pb-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-3 w-24" /></div>
              </div>
            ))}
          </div>
      </div>

      {preview?.adminResponse && (
        <div className="space-y-2 border-t border-border/60 bg-muted/20 py-4 md:p-5 lg:p-6">
          <p className="text-ui-caption font-bold uppercase tracking-wider text-foreground">MENRO Official Response</p>
          <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5">
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )}
    </div>

    {showAction && (
      <div className="pt-3 lg:pt-2">
        <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div>
          <Skeleton className="h-4 w-4 shrink-0" />
        </div>
      </div>
    )}
  </div>
  );
};

/* ─── Admin Community Posts Skeletons ─── */
export const AdminPostsSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-10">
    <span className="sr-only">Loading community posts…</span>
    <div aria-hidden="true" className="space-y-6 sm:space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 sm:h-9 w-56 max-w-full" />
          <Skeleton className="mt-0.5 h-4 sm:h-5 w-[550px] max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-xl" />
      </div>
      <KPICardsSkeleton />
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 overflow-hidden pb-1 sm:pb-0">
            {["w-[104px]", "w-[106px]", "w-[76px]", "w-[104px]", "w-[96px]"].map((width, i) => (
              <Skeleton key={i} className={cn("h-10 shrink-0 rounded-xl", width)} />
            ))}
          </div>
          <Skeleton className="h-10 w-full xl:w-[330px] shrink-0 rounded-xl" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <Skeleton className="mr-1 h-4 w-16" />
          <Skeleton className="h-9 w-[130px] rounded-xl" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-[130px] rounded-xl" />
            <div className="flex items-center gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-0.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
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
    <span className="sr-only">Loading articles…</span>
    {viewMode === "grid" ? (
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              <Skeleton className="h-3 w-28" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 sm:h-5 w-full" />
                <Skeleton className="h-4 sm:h-5 w-5/6" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                <Skeleton className="h-4 w-32 max-w-[60%]" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-end pt-1"><Skeleton className="h-8 w-8 rounded-xl" /></div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div aria-hidden="true" className="bg-card border border-border/80 rounded-2xl overflow-x-auto shadow-2xs">
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
    )}
  </div>
);

export const AdminPostDetailSkeleton = () => (
  <div role="status" aria-busy="true" className="w-full max-w-[1000px] mx-auto pb-12">
    <span className="sr-only">Loading article details…</span>
    <div aria-hidden="true" className="space-y-6 sm:space-y-8">
      <div className="space-y-6">
        <div className="relative w-full aspect-[1080/566] max-h-[566px] rounded-2xl overflow-hidden border border-border/40">
          <Skeleton className="w-full h-full rounded-none" />
          <Skeleton className="absolute top-4 left-4 h-7 w-24 rounded-md bg-background/60" />
          <Skeleton className="absolute top-4 right-4 h-7 w-24 rounded-md bg-background/60" />
        </div>
        <div className="space-y-3 pt-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-8 sm:h-9 md:h-12 w-full" />
              <Skeleton className="h-8 sm:h-9 md:h-12 w-3/4" />
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {["w-24", "w-32", "w-20", "w-20"].map((width, i) => <Skeleton key={i} className={cn("h-4 sm:h-5", width)} />)}
          </div>
        </div>
        <div className="border-t border-border/60" />
        <div className="space-y-4">
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
  </div>
);

/* ─── Resident Post Detail Skeleton ─── */
export const ResidentPostDetailSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-0">
    {/* Hero image */}
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-[280px] sm:h-[420px]" />
    </div>

    {/* Title & description */}
    <div className="pt-5 space-y-2">
      <Skeleton className="h-7 sm:h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>

    {/* Meta bar */}
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-4 border-b border-border">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-20" />
    </div>

    {/* Action bar */}
    <div className="flex items-center gap-2 py-3 border-b border-border">
      <Skeleton className="h-9 w-16 rounded-md" />
      <Skeleton className="h-9 w-16 rounded-md" />
      <div className="flex-1" />
      <Skeleton className="h-9 w-9 rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
    </div>

    {/* Body */}
    <div className="py-8 space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>

    {/* Tags */}
    <div className="flex flex-wrap gap-2 pb-6 border-b border-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-20 rounded-md" />
      ))}
    </div>

    {/* Related Posts */}
    <div className="py-8 space-y-4">
      <Skeleton className="h-5 w-28" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Content/Posts Grid Skeleton ─── */
export const ContentGridSkeleton = () => (
  <div className="space-y-6 sm:space-y-8">
    {/* Search bar */}
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="h-10 flex-1 max-w-md rounded-md" />
    </div>

    {/* Filter tabs */}
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-24 rounded-full" />
      ))}
    </div>

    {/* Main grid with sidebar */}
    <div className="grid lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-6 lg:gap-8">
      <div className="space-y-8 min-w-0">
        {/* Featured post carousel */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-20" />
          <div className="rounded-2xl overflow-hidden border border-border">
            <Skeleton className="h-56 sm:h-72 md:h-80 w-full" />
            {/* Featured post meta area */}
            <div className="p-4 sm:p-5 bg-card border-t border-border space-y-2.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-12 rounded-lg" />
                  <Skeleton className="h-6 w-12 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-7 h-7 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post cards grid */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-20" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                <Skeleton className="h-40 sm:h-44 w-full" />
                <div className="p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  {/* Tags */}
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-6 w-12 rounded-lg" />
                      <Skeleton className="h-6 w-12 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Skeleton className="w-7 h-7 rounded-lg" />
                      <Skeleton className="w-7 h-7 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block space-y-5">
        {/* Latest Post */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        {/* Popular Posts */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2">
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
        {/* Upcoming Events */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          ))}
        </div>
        {/* Categories */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
        </div>
        {/* Tags */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-12" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-md" />
            ))}
          </div>
        </div>
        {/* This Month */}
        <div className="bg-card border border-border rounded-xl p-4 text-center space-y-1">
          <Skeleton className="h-3 w-20 mx-auto" />
          <Skeleton className="h-8 w-8 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  </div>
);

/* ─── Split Panel Skeleton (table + detail) ─── */
export const SplitPanelSkeleton = () => (
  <div className="flex gap-5 items-start">
    <div className="flex-1 min-w-0">
      <TableSkeleton cols={6} rows={8} />
    </div>
    <div className="hidden lg:block w-[400px] shrink-0">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  </div>
);

/* ─── Landing Page Manager Skeleton ─── */
export const LandingManagerSkeleton = () => (
  <div className="space-y-6">
    {/* Action bar */}
    <div className="flex items-center gap-2 flex-wrap p-3 bg-card border border-border rounded-xl">
      <Skeleton className="h-8 w-[170px] rounded-md" />
      <div className="w-px h-6 bg-border mx-1" />
      <Skeleton className="h-8 w-[150px] rounded-md" />
      <div className="ml-auto">
        <Skeleton className="h-3 w-36" />
      </div>
    </div>

    {/* Two-panel layout matching lg:grid-cols-[340px,1fr] */}
    <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6">
      {/* Left: Section list */}
      <div className="space-y-3">
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-4 h-3 shrink-0" />
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full shrink-0" />
              <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Right: Editor panel placeholder */}
      <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-24 px-8">
        <Skeleton className="w-16 h-16 rounded-2xl mb-4" />
        <Skeleton className="h-5 w-36 mb-2" />
        <Skeleton className="h-3.5 w-64" />
      </div>
    </div>
  </div>
);

/* ─── Route Manager Page Skeleton ─── */
export const RouteManagerPageSkeleton = ({ viewMode = "DAY_VIEW" }: { viewMode?: "DAY_VIEW" | "TABLE_VIEW" }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-10">
    <span className="sr-only">Loading collection routes…</span>
    <div aria-hidden="true" className="space-y-6 sm:space-y-7">
      <div className="flex flex-col justify-between gap-4 pb-1 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-56 max-w-full sm:h-9" />
          <Skeleton className="mt-0.5 h-4 w-[590px] max-w-full sm:h-5" />
        </div>
        <Skeleton className="h-10 w-40 shrink-0 rounded-xl" />
      </div>

      <KPICardsSkeleton />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {["w-[105px]", "w-[80px]", "w-[82px]"].map((width, i) => (
              <Skeleton key={i} className={cn("h-10 shrink-0 rounded-xl", width)} />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border/80 bg-muted/60 p-0.5">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            <Skeleton className="h-10 w-full rounded-xl sm:max-w-xs md:max-w-sm" />
            <Skeleton className="h-9 w-36 shrink-0 rounded-xl" />
          </div>
          <Skeleton className="hidden h-4 w-32 sm:block" />
        </div>
      </section>

      {viewMode === "DAY_VIEW" ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, day) => (
            <div key={day} className="space-y-3.5">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-36 rounded-md" />
                </div>
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col justify-between space-y-3.5 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                        <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-20 rounded-md" /></div>
                      </div>
                      <div className="flex items-center gap-1"><Skeleton className="h-6 w-16 rounded-md" /><Skeleton className="h-8 w-8 rounded-xl" /></div>
                    </div>
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="min-w-[860px]">
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
      )}
    </div>
  </div>
);

/* ─── Barangay Manager Skeletons ─── */
export const BarangayStreetRowsSkeleton = () => (
  <div role="status" aria-busy="true" className="divide-y divide-border/40">
    <span className="sr-only">Loading streets…</span>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="grid grid-cols-[minmax(8rem,1fr)_6.5rem_6.5rem_7.5rem] items-center px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 pr-2">
          <Skeleton className="h-4 w-32 max-w-[60%]" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
        </div>
        <Skeleton className="mx-auto h-4 w-6" />
        <Skeleton className="mx-auto h-4 w-6" />
        <div className="flex items-center justify-center gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export const BarangayManagerPageSkeleton = () => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-8">
    <span className="sr-only">Loading barangays…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="pb-1">
        <Skeleton className="h-8 w-60 max-w-full sm:h-9" />
        <Skeleton className="mt-0.5 h-4 w-[600px] max-w-full sm:h-5" />
      </div>

      <KPICardsSkeleton />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
        <aside className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-3.5 h-10 w-full rounded-xl" />
          <div className="mt-4 min-h-[26rem] space-y-2 pr-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 p-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-3 w-48 max-w-full" /></div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border/60 pt-3.5"><Skeleton className="h-4 w-24" /></div>
        </aside>

        <section className="flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="h-4 w-28" /></div>
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-1.5"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-56 max-w-full" /></div>
            </div>
            <Skeleton className="h-6 w-11 shrink-0 rounded-md" />
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between gap-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-24" /></div>
            <Skeleton className="mt-2.5 h-10 w-full rounded-xl" />
            <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
              <div className="overflow-x-auto">
                <div className="min-w-[485px]">
                  <div className="grid grid-cols-[minmax(8rem,1fr)_6.5rem_6.5rem_7.5rem] items-center border-b border-border/70 px-3 py-3">
                    {["w-24", "w-20", "w-20", "w-16"].map((width, i) => <Skeleton key={i} className={cn("h-3", width)} />)}
                  </div>
                  <BarangayStreetRowsSkeleton />
                </div>
              </div>
            </div>
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
      <TableRow key={i} aria-busy="true">
        <TableCell className="py-3 pl-5">
          {i === 0 && <span className="sr-only">Loading residents…</span>}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20 md:hidden" /></div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="hidden lg:table-cell"><div className="space-y-1"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div></TableCell>
        <TableCell><Skeleton className="h-7 w-28 rounded-lg" /></TableCell>
        <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
        <TableCell className="pr-5 text-right"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
      </TableRow>
    ))}
  </>
);

export const ResidentManagerPageSkeleton = () => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto">
    <span className="sr-only">Loading resident accounts…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="pb-1"><Skeleton className="h-8 w-56 max-w-full sm:h-9" /><Skeleton className="mt-0.5 h-4 w-[555px] max-w-full sm:h-5" /></div>

      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(
            "flex flex-col justify-between space-y-2.5 p-4 sm:p-5",
            i % 2 === 0 && "sm:border-r sm:border-border/70 xl:border-r-0",
            i < 3 && "xl:border-r xl:border-border/70",
            i < 2 && "border-b border-border/70 xl:border-b-0",
          )}>
            <div className="flex min-h-[22px] items-center"><Skeleton className="h-5 w-32 max-w-full rounded-md" /></div>
            <Skeleton className="h-8 w-16 sm:h-9" />
            <Skeleton className="h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="flex flex-col items-stretch justify-between gap-3.5 border-b border-border/80 bg-card p-4 sm:p-5 xl:flex-row xl:items-center">
          <div className="flex shrink-0 items-center gap-2 overflow-hidden pb-1 xl:pb-0">
            {["w-[135px]", "w-[75px]", "w-[110px]", "w-[82px]"].map((width, i) => <Skeleton key={i} className={cn("h-9 shrink-0 rounded-xl", width)} />)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center xl:justify-end">
            <Skeleton className="h-9 w-full rounded-xl sm:w-64 lg:w-72" />
            <Skeleton className="h-9 w-full rounded-xl sm:w-[170px]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border/80 bg-muted/40">
              <TableRow>
                <TableHead className="py-3.5 pl-5"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3.5 md:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3.5 lg:table-cell"><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3.5 xl:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="hidden py-3.5 xl:table-cell"><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="py-3.5"><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="w-12 py-3.5 pr-5" />
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
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto">
    <span className="sr-only">Loading resident profile…</span>
    <div aria-hidden="true" className="space-y-6">
      <div><Skeleton className="h-7 w-48" /><Skeleton className="mt-0.5 h-4 w-[490px] max-w-full" /></div>
      <div className="space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="space-y-1.5"><div className="flex items-center gap-2.5"><Skeleton className="h-6 w-44" /><Skeleton className="h-6 w-16 rounded-md" /></div><Skeleton className="h-4 w-24" /></div>
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border/60 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-36 max-w-full" /></div>)}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2"><div className="space-y-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-6 w-16 rounded-md" /></div>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="grid grid-cols-4 gap-4 border-b border-border/80 bg-muted/40 px-5 py-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="grid grid-cols-4 gap-4 border-b border-border/60 px-5 py-3 last:border-0"><Skeleton className="h-4 w-28 max-w-full" /><Skeleton className="h-4 w-24 max-w-full" /><Skeleton className="h-4 w-20 max-w-full" /><Skeleton className="h-6 w-20 max-w-full rounded-md" /></div>)}
        </div>
      </div>
    </div>
  </div>
);

/* ─── Shared admin page title skeleton ─── */
const AdminPageTitleSkeleton = ({ title, description, badge, fontDisplay = true }: {
  title: string;
  description: string;
  badge?: string;
  fontDisplay?: boolean;
}) => (
  <header className="flex flex-col justify-between gap-4 pb-1 sm:flex-row sm:items-center">
    <div className="min-w-0">
      <div className={cn(badge && "flex items-center gap-2.5")}>
        <Skeleton className={cn("w-fit max-w-full text-2xl font-semibold tracking-tight sm:text-3xl", fontDisplay && "font-display")}>
          <span className="invisible">{title}</span>
        </Skeleton>
        {badge && (
          <Skeleton className="hidden rounded-md border px-2.5 py-0.5 text-ui-caption font-semibold sm:inline-flex">
            <span className="invisible">{badge}</span>
          </Skeleton>
        )}
      </div>
      <Skeleton className="mt-0.5 w-fit max-w-full text-xs sm:text-sm">
        <span className="invisible">{description}</span>
      </Skeleton>
    </div>
  </header>
);

/* ─── Admin Truck Tracking Page Skeleton ─── */
export const AdminTruckTrackingPageSkeleton = ({ title, description }: { title: string; description: string }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto">
    <span className="sr-only">Loading live fleet tracking…</span>
    <div aria-hidden="true" className="space-y-5">
      <AdminPageTitleSkeleton title={title} description={description} badge="Candelaria" />

      <KPICardsSkeleton />

      <div className="flex justify-center pb-1 pt-0.5 xl:hidden">
        <div className="flex w-full max-w-xs items-center gap-1 rounded-xl border border-border/80 bg-muted/70 p-1 shadow-2xs">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 flex-1 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="relative h-[430px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:h-[560px] xl:col-span-2 xl:h-[700px]">
          <Skeleton className="h-full w-full rounded-none" />
          <div className="absolute right-3 top-3 space-y-1 rounded-xl border border-border/70 bg-card/75 p-1 shadow-2xs">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        <div className="hidden max-h-[700px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs xl:flex">
          <div className="flex shrink-0 items-center gap-2">
            <div className="grid h-10 flex-1 grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
          <div className="space-y-3 overflow-hidden pt-3 pr-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                    <div className="flex items-center gap-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-5 w-16 rounded-md" /></div>
                  </div>
                  <Skeleton className="h-5 w-16 shrink-0 rounded-lg" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2">
                  <Skeleton className="h-4 w-32 max-w-full" />
                  <Skeleton className="h-4 w-10 shrink-0" />
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
      <TableRow key={i} className="border-b border-border/60">
        <TableCell className="py-3"><Skeleton className="h-4 w-28" /></TableCell>
        <TableCell className="py-3"><Skeleton className="h-5 w-32 rounded-md" /></TableCell>
        <TableCell className="py-3"><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></TableCell>
        <TableCell className="py-3"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="py-3 text-center"><Skeleton className="mx-auto h-5 w-9 rounded-full" /></TableCell>
        <TableCell className="py-3"><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
        <TableCell className="py-3 pr-4 text-right"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
      </TableRow>
    ))}
  </>
);

export const WasteReportsPageSkeleton = ({ title, description }: { title: string; description: string }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-10">
    <span className="sr-only">Loading waste reports…</span>
    <div aria-hidden="true" className="space-y-5 sm:space-y-6">
      <AdminPageTitleSkeleton title={title} description={description} />

      <KPICardsSkeleton />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {["w-[76px]", "w-[92px]", "w-[110px]", "w-[98px]", "w-[82px]"].map((width, i) => (
              <Skeleton key={i} className={cn("h-[34px] shrink-0 rounded-xl", width)} />
            ))}
          </div>
          <div className="flex w-full items-center gap-2 xl:w-auto">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-xl xl:w-[330px] xl:flex-none" />
            <Skeleton className="h-10 w-24 shrink-0 rounded-xl xl:hidden" />
          </div>
        </div>
        <div className="hidden items-center gap-2 border-t border-border/70 bg-muted/20 px-5 py-3.5 xl:flex">
          <Skeleton className="mr-1 h-4 w-16 shrink-0" />
          <Skeleton className="h-9 w-[130px] rounded-xl" />
          <Skeleton className="h-9 w-[130px] rounded-xl" />
          <Skeleton className="h-9 w-[120px] rounded-xl" />
          <Skeleton className="ml-auto h-9 w-[130px] rounded-xl" />
        </div>
      </section>

      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/30">
                <TableHead className="py-3.5 text-xs font-semibold">Reference</TableHead>
                <TableHead className="py-3.5 text-xs font-semibold">Violation Type</TableHead>
                <TableHead className="py-3.5 text-xs font-semibold">Location</TableHead>
                <TableHead className="py-3.5 text-xs font-semibold">Date Filed</TableHead>
                <TableHead className="py-3.5 text-center text-xs font-semibold">Photos</TableHead>
                <TableHead className="py-3.5 text-xs font-semibold">Status</TableHead>
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

/* ─── Collector Manager Skeletons ─── */
export const CollectorManagerPageSkeleton = ({ activeTab = "drivers" }: { activeTab?: "drivers" | "trucks" }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-10">
    <span className="sr-only">Loading collectors and fleet trucks…</span>
    <div aria-hidden="true" className="space-y-6 sm:space-y-7">
      <div className="flex flex-col justify-between gap-4 pb-1 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><Skeleton className="h-8 w-64 max-w-full sm:h-9" /><Skeleton className="mt-0.5 h-4 w-[625px] max-w-full sm:h-5" /></div>
        <Skeleton className="h-10 w-32 shrink-0 rounded-xl" />
      </div>

      <KPICardsSkeleton />

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {(activeTab === "drivers" ? ["w-[112px]", "w-[75px]", "w-[105px]"] : ["w-[100px]", "w-[108px]", "w-[105px]"]).map((width, i) => <Skeleton key={i} className={cn("h-10 shrink-0 rounded-xl", width)} />)}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border/80 bg-muted/60 p-0.5"><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-28 rounded-lg" /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5"><Skeleton className="h-10 w-full rounded-xl sm:max-w-xs md:max-w-sm" /><Skeleton className="h-9 w-40 shrink-0 rounded-xl" /></div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col justify-between space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3.5"><Skeleton className="h-11 w-11 shrink-0 rounded-2xl" /><div className="space-y-1.5"><Skeleton className="h-5 w-28" /><Skeleton className="h-4 w-20" /></div></div>
              <div className="flex shrink-0 items-center gap-1.5"><Skeleton className="h-6 w-16 rounded-md" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
            </div>
            <div className="space-y-2 border-t border-border/60 pt-2">
              {Array.from({ length: activeTab === "drivers" ? 4 : 2 }).map((_, row) => <div key={row} className="flex items-center gap-2"><Skeleton className="h-3.5 w-3.5 shrink-0 rounded" /><Skeleton className="h-4 w-32 max-w-full" /></div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CollectorManagerProfileSkeleton = ({ kind = "collector" }: { kind?: "collector" | "truck" }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto">
    <span className="sr-only">Loading {kind === "truck" ? "truck details" : "collector profile"}…</span>
    <div aria-hidden="true" className="space-y-6">
      <div><Skeleton className="h-7 w-48" /><Skeleton className="mt-0.5 h-4 w-[550px] max-w-full" /></div>
      <div className="space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4"><Skeleton className="h-14 w-14 shrink-0 rounded-2xl" /><div className="space-y-1.5"><div className="flex items-center gap-2.5"><Skeleton className="h-6 w-40" /><Skeleton className="h-6 w-16 rounded-md" /></div><Skeleton className="h-4 w-28" /></div></div>
          <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-9 w-28 rounded-xl" /><Skeleton className="h-9 w-28 rounded-xl" />{kind === "collector" && <Skeleton className="h-9 w-28 rounded-xl" />}</div>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border/60 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-36 max-w-full" /></div>)}
        </div>
      </div>
      <div className="space-y-4"><Skeleton className="h-6 w-44" /><div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs"><Skeleton className="h-4 w-32" /><Skeleton className="mt-3 h-3 w-48" /><Skeleton className="mt-4 h-2 w-full rounded-full" /></div></div>
    </div>
  </div>
);

/* ─── Analytics Dashboard Skeleton ─── */
export const AnalyticsDashboardSkeleton = ({ title, description }: { title: string; description: string }) => (
  <main role="status" aria-busy="true" className="mx-auto w-full max-w-[1600px] pb-12">
    <span className="sr-only">Loading analytics dashboard…</span>
    <div aria-hidden="true" className="space-y-5 sm:space-y-6">
      <AdminPageTitleSkeleton title={title} description={description} fontDisplay={false} />

      <section className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <Skeleton className="h-4 w-60 max-w-full" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-10 w-full rounded-xl sm:w-[168px]" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-[190px]" />
        </div>
      </section>

      <KPICardsSkeleton />

      <nav className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-4 shadow-2xs sm:p-5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {[86, 151, 144, 147, 93, 137, 147].map((width, i) => (
            <Skeleton key={i} className="h-8 shrink-0 rounded-xl" style={{ width }} />
          ))}
        </div>
      </nav>

      <section className="space-y-4">
        <div className="space-y-1 pb-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-[500px] max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5"><Skeleton className="h-8 w-8 shrink-0 rounded-xl" /><div className="space-y-1"><Skeleton className="h-4 w-52 max-w-full" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div>
              <Skeleton className="h-7 w-12 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="h-[230px] w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5"><Skeleton className="h-8 w-8 shrink-0 rounded-xl" /><div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-64 max-w-full" /></div></div>
              <Skeleton className="h-7 w-10 shrink-0" />
            </div>
            <div className="flex h-[200px] items-center justify-center"><Skeleton className="h-[155px] w-[155px] rounded-full" /></div>
            <div className="flex justify-center gap-3 border-t border-border/60 pt-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-20" />)}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center gap-2.5"><Skeleton className="h-8 w-8 rounded-xl" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3.5 w-52" /></div></div>
            <div className="divide-y divide-border/60 rounded-xl bg-muted/35 px-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex justify-between gap-4 py-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-8" /></div>)}</div>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
            <div className="mb-4 flex items-center gap-2.5"><Skeleton className="h-8 w-8 rounded-xl" /><div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /></div></div>
            <Skeleton className="h-[150px] w-full rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  </main>
);

/* ─── Audit Logs Skeleton ─── */
export const AuditLogsSkeleton = ({ title, description }: { title: string; description: string }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-10">
    <span className="sr-only">Loading audit logs…</span>
    <div aria-hidden="true" className="space-y-6 sm:space-y-7">
      <AdminPageTitleSkeleton title={title} description={description} />

      <KPICardsSkeleton />

      <div className="rounded-2xl border border-border/80 bg-card p-2.5 shadow-2xs sm:p-3">
        <div className="flex flex-col items-stretch justify-between gap-3 xl:flex-row xl:items-center">
          <div className="flex max-w-2xl flex-1 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-full shrink-0 rounded-xl sm:w-40" />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {["w-[72px]", "w-[78px]", "w-[84px]"].map((width, i) => <Skeleton key={i} className={cn("h-10 rounded-xl", width)} />)}
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[1050px]">
            <div className="grid grid-cols-[40px_0.95fr_1.1fr_1.15fr_0.9fr_1.1fr_1.8fr] items-center gap-4 border-b border-border/80 bg-muted/30 px-4 py-3.5">
              <div />
              {["w-20", "w-24", "w-32", "w-16", "w-28", "w-28"].map((width, i) => <Skeleton key={i} className={cn("h-3.5 max-w-full", width)} />)}
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[40px_0.95fr_1.1fr_1.15fr_0.9fr_1.1fr_1.8fr] items-center gap-4 border-b border-border/60 px-4 py-3.5 last:border-b-0">
                <Skeleton className="h-6 w-6 rounded-lg" />
                <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="h-6 w-28 max-w-full rounded-md" />
                <Skeleton className="h-6 w-20 max-w-full rounded-md" />
                <Skeleton className="h-4 w-24 max-w-full" />
                <Skeleton className="h-4 w-52 max-w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/60 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2"><div className="flex gap-1.5"><Skeleton className="h-5 w-24 rounded-md" /><Skeleton className="h-5 w-20 rounded-md" /></div><Skeleton className="h-6 w-6 rounded-lg" /></div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ─── Collection History Skeleton ─── */
export const CollectionHistorySkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
    <Skeleton className="h-4 w-32" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    ))}
  </div>
);

/* ─── Announcements Page Skeleton ─── */
export const AnnouncementsPageSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto">
    <span className="sr-only">Loading announcements…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 sm:h-9 w-56 max-w-full" />
          <Skeleton className="mt-0.5 h-4 sm:h-5 w-[560px] max-w-full" />
        </div>
        <Skeleton className="h-11 w-44 shrink-0 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(
            "flex flex-col justify-between space-y-2.5 p-4 sm:p-5",
            i % 2 === 0 && "border-r border-border/70",
            i < 3 && "lg:border-r lg:border-border/70",
            i === 3 && "lg:border-r-0",
            i < 2 && "border-b border-border/70 lg:border-b-0",
          )}>
            <div className="flex items-center min-h-[22px]"><Skeleton className="h-5 w-24 rounded-md" /></div>
            <Skeleton className="h-8 sm:h-9 w-16" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-xs">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-1.5 overflow-hidden pb-1 sm:pb-0">
            {["w-[108px]", "w-[78px]", "w-[99px]", "w-[78px]", "w-[92px]"].map((width, i) => (
              <Skeleton key={i} className={cn("h-9 shrink-0 rounded-xl", width)} />
            ))}
          </div>
          <Skeleton className="h-10 w-full shrink-0 rounded-xl xl:w-[330px]" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <Skeleton className="mr-1 h-4 w-16" />
          <Skeleton className="h-9 w-[135px] rounded-xl" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-[130px] rounded-xl" />
            <div className="flex items-center gap-0.5 rounded-xl border border-border/80 bg-muted/60 p-0.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      </section>

      <AnnouncementsContentSkeleton viewMode={viewMode} />
    </div>
  </div>
);

export const AnnouncementsContentSkeleton = ({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) => (
  <div role="status" aria-busy="true">
    <span className="sr-only">Loading announcements…</span>
    <div aria-hidden="true">
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
              <div className="relative h-28 border-b border-border/40">
                <Skeleton className="h-full w-full rounded-none" />
                <Skeleton className="absolute left-3 top-3 h-5 w-28 rounded-md bg-background/60" />
                <Skeleton className="absolute right-3 top-3 h-5 w-16 rounded-md bg-background/60" />
              </div>
              <div className="flex flex-1 flex-col space-y-3.5 p-4 sm:p-5">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-2xs">
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
      )}
    </div>
  </div>
);

/* ─── Resident Dashboard Page Skeleton ─── */
const DashboardCardSkeleton = () => (
  <div className="space-y-4 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs lg:p-5">
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-5 w-24 rounded-md" />
    </div>
    <div className="flex items-start gap-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-border/50 pt-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-3 w-32" />
  </div>
);

export const ResidentDashboardSkeleton = ({ dayCount, firstDayIndex }: { dayCount: number; firstDayIndex: number }) => (
  <div role="status" aria-label="Loading resident dashboard" className="mx-auto w-full max-w-[1600px] space-y-3 md:space-y-5 lg:space-y-6">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2.5"><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-6 w-24 rounded-md" /></div>
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex w-full justify-between gap-2.5 md:w-auto md:justify-end">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <div className="md:col-span-2 lg:col-span-1"><DashboardCardSkeleton /></div>
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:gap-4">
      <div className="min-h-[165px] rounded-2xl border border-border bg-card p-4 lg:p-5">
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:gap-4">
          <Skeleton className="h-[130px] w-full shrink-0 rounded-xl md:w-[190px] lg:w-[200px]" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
      <div className="min-h-[165px] space-y-4 rounded-2xl border border-border bg-card p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>

    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="mx-auto h-4 w-6" />)}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: dayCount }).map((_, index) => (
          <div key={index} className="aspect-square rounded-xl border border-border/60 p-1.5 sm:aspect-auto sm:min-h-[95px] sm:p-2">
            {index >= firstDayIndex && <Skeleton className="h-5 w-5 rounded-full" />}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-48 max-w-[50%]" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:gap-4">
      <div className="min-h-[210px] space-y-4 rounded-2xl bg-forest p-4 lg:p-5">
        <Skeleton className="h-3 w-32 bg-forest-foreground/20" />
        <Skeleton className="h-5 w-1/2 bg-forest-foreground/20" />
        <Skeleton className="h-4 w-5/6 bg-forest-foreground/20" />
        <Skeleton className="h-4 w-2/3 bg-forest-foreground/20" />
      </div>
      <div className="min-h-[210px] space-y-4 rounded-2xl border border-border/80 bg-card p-4 lg:p-5">
        <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-36" /></div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/40 p-2"><Skeleton className="size-4 shrink-0" /><div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24 max-w-full" /></div></div>)}
        </div>
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  </div>
);


/* ─── Resident Community Updates Skeletons ─── */
export const ContentCardsSkeleton = ({ count = 6 }: { count?: number }) => (
  <div role="status" aria-label="Loading community updates" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
        <Skeleton className="aspect-[16/10] w-full rounded-none" />
        <div className="space-y-3 p-4 lg:p-5">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ResidentContentsSkeleton = () => (
  <div role="status" aria-label="Loading Community Updates" className="mx-auto w-full max-w-[1400px] space-y-4 pb-4 md:space-y-6 lg:space-y-8 lg:pb-6">
    <div className="hidden space-y-2 md:block">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex gap-1.5">
          {["w-24", "w-28", "w-20"].map((width, index) => <Skeleton key={index} className={`h-9 ${width} rounded-xl`} />)}
        </div>
        <Skeleton className="h-9 w-9 rounded-xl md:w-36" />
      </div>
    </div>
    <div className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 md:grid-cols-12 md:gap-6 md:p-6 lg:gap-8 lg:p-8">
      <div className="space-y-4 md:col-span-7">
        <div className="flex gap-2"><Skeleton className="h-5 w-20 rounded-md" /><Skeleton className="h-5 w-24 rounded-md" /></div>
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="aspect-[16/10] w-full rounded-xl md:col-span-5" />
    </div>
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-24" />
      </div>
      <ContentCardsSkeleton />
    </section>
  </div>
);


/* ─── Resident Collection Tracking Skeleton ─── */
export const ResidentTrackingSkeleton = () => (
  <div role="status" aria-label="Loading collection tracking" className="mx-auto w-full max-w-[1600px] px-2 md:px-4">
    <div className="hidden pb-1 md:mb-4 md:block">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
    </div>
    <div className="space-y-3.5 md:space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs md:flex-row md:items-center md:p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-60 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-52 max-w-full rounded-xl" />
      </div>
      <div className="relative h-[clamp(360px,calc(100dvh-12rem),520px)] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm md:h-[500px] lg:h-[580px]">
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute left-2.5 top-2.5 w-64 max-w-[calc(100%-56px)] space-y-3 rounded-2xl border border-border/80 bg-card/90 p-3.5 shadow-md lg:left-3 lg:top-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="absolute bottom-3 right-3 h-9 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);
