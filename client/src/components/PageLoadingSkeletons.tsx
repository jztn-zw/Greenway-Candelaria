import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ─── Admin Dashboard Skeletons ─── */

export const KPICardsSkeleton = () => (
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

export const TrendChartsSkeleton = () => (
  <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-md" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const OperationsAndAttentionSkeleton = () => (
  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
    {Array.from({ length: 2 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ))}
  </div>
);

export const ReportsTableSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-4 py-2">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ActivityFeedSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 px-2 py-2.5">
          <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const CalendarSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-8 sm:h-10 rounded-lg" />
        ))}
      </div>
    </CardContent>
  </Card>
);

/* ─── Resident Dashboard Skeletons ─── */

export const HeroCardsSkeleton = () => (
  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i} className="border border-border overflow-hidden">
        <CardContent className="p-0">
          <Skeleton className="h-1 w-full" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const StatsCardsSkeleton = () => (
  <div className="grid gap-3 grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i} className="border border-border">
        <CardContent className="p-3 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" />
            <Skeleton className="w-3 h-3 rounded hidden sm:block" />
          </div>
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-2.5 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const NotificationsStripSkeleton = () => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-14" />
    </div>
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-3/4" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AnnouncementSkeleton = () => (
  <div className="grid gap-3 grid-cols-1 md:grid-cols-5">
    <Card className="md:col-span-3 border border-border overflow-hidden">
      <CardContent className="p-0">
        <Skeleton className="h-1 w-full" />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
    <div className="md:col-span-2">
      <Skeleton className="h-full min-h-[160px] rounded-xl" />
    </div>
  </div>
);

export const EngagementSkeleton = () => (
  <Card className="border border-border overflow-hidden">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const QuickActionsAndContactSkeleton = () => (
  <Card className="border border-border overflow-hidden rounded-2xl shadow-sm">
    <CardContent className="p-4 sm:p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="pt-2 border-t border-border/60 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </CardContent>
  </Card>
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

/* ─── Dashboard Greeting Skeleton (Universal Resident & Collector) ─── */
export const DashboardGreetingSkeleton = () => (
  <div className="mb-2 animate-in fade-in duration-200">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-6 w-44 sm:w-56" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-60 sm:w-80" />
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);

/* ─── Collector Full Dashboard Skeleton ─── */
export const CollectorDashboardSkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8 animate-in fade-in duration-300">
    {/* Greeting Header */}
    <DashboardGreetingSkeleton />

    {/* Assignment Card Hero */}
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-muted/30 border-b border-border flex items-center justify-between">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>

    {/* Quick Action Buttons */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>

    {/* 3 Today KPI Stat Cards */}
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-2 shadow-sm">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>

    {/* Lower Grid (Truck Status & Messages) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl mt-2" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 2 }).map((_, j) => (
          <div key={j} className="space-y-1 py-1">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Dashboard Header Skeleton ─── */
export const DashboardHeaderSkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-5 md:p-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-7 w-32 rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
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
          <Skeleton className="h-6 w-16 rounded-full" />
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
  <div className="max-w-3xl mx-auto space-y-5 pb-8 animate-in fade-in duration-300">
    {/* Header card with avatar */}
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shrink-0" />
        <div className="space-y-2 flex-1 text-center sm:text-left min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-60" />
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 flex-wrap">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      </div>
    </div>

    {/* Personal Information section */}
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-36" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>

    {/* Account Security */}
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
    </div>

    {/* Reports Summary */}
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/40 p-3.5 text-center space-y-2 border border-border/60">
            <Skeleton className="w-5 h-5 rounded-lg mx-auto" />
            <Skeleton className="h-6 w-10 mx-auto" />
            <Skeleton className="h-2.5 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Municipal Support */}
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Admin Profile Skeleton ─── */
export const AdminProfileSkeleton = () => (
  <div className="space-y-6">
    {/* Header card with avatar + role badge */}
    <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2 flex-1 text-center sm:text-left">
          <Skeleton className="h-6 w-36 mx-auto sm:mx-0" />
          <Skeleton className="h-5 w-24 rounded-full mx-auto sm:mx-0" />
          <Skeleton className="h-3 w-28 mx-auto sm:mx-0" />
        </div>
      </div>
    </div>

    {/* Personal Information */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-32" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>

    {/* Activity Summary (4 stats) */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-muted/50 p-3.5 text-center space-y-2">
            <Skeleton className="w-4 h-4 rounded mx-auto" />
            <Skeleton className="h-5 w-10 mx-auto" />
            <Skeleton className="h-2.5 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Notification Preferences (6 toggle rows) */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-36" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0 gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      ))}
    </div>

    {/* Active Sessions */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2.5 w-36" />
            </div>
          </div>
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>

    {/* 2FA section */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex items-center justify-between py-2 gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
    </div>

    {/* Logout button */}
    <div className="space-y-3 pb-4">
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  </div>
);

/* ─── Resident Settings Page Skeleton (1:1 with ResidentSettings.tsx) ─── */
export const SettingsSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
    {/* Page Header */}
    <div className="flex items-center gap-3 mb-2">
      <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
      <div className="space-y-1.5 min-w-0">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3.5 w-72" />
      </div>
    </div>

    {/* Section 1: Collection Preferences */}
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border/60">
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="w-48 sm:w-56 h-9 rounded-xl shrink-0" />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border/60">
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full shrink-0" />
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="w-32 h-9 rounded-xl shrink-0" />
        </div>
      </div>
    </div>

    {/* Section 2: Notification Alerts */}
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-6 w-11 rounded-full shrink-0" />
        </div>
      ))}
    </div>

    {/* Section 3: Appearance */}
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-11 rounded-full shrink-0" />
      </div>
    </div>

    {/* Section 4: Language Preference */}
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>

    {/* Section 5: About & Legal */}
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="w-4 h-4 rounded shrink-0" />
        </div>
      ))}
    </div>

    {/* Section 6: Help & Support */}
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="w-4 h-4 rounded shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Admin Settings Skeleton (more sections, org details, inputs) ─── */
export const AdminSettingsSkeleton = () => (
  <div className="space-y-6">
    {/* Organization Details section with inputs */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>

    {/* Appearance */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
    </div>

    {/* Language */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3 w-56" />
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>

    {/* System Maintenance */}
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between py-3 gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      <div className="rounded-lg bg-muted/50 p-4 space-y-4">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>

    {/* Security + Controls sections (toggle rows) */}
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
            <div key={j} className="flex items-center justify-between py-3 border-b border-border last:border-b-0 gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <Skeleton className="h-6 w-11 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ─── Schedule Grid Skeleton ─── */
export const ScheduleGridSkeleton = () => (
  <div className="space-y-5">
    {/* Info box */}
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
      <Skeleton className="w-4 h-4 rounded mt-0.5 shrink-0" />
      <Skeleton className="h-3 w-full" />
    </div>

    {/* Legend */}
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>

    {/* 7-day grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
          <Skeleton className="h-1 w-full" />
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-16 hidden lg:block" />
            <div className="flex flex-col items-center gap-1.5 py-2">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-14 italic" />
            </div>
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>

    {/* Reminder Settings card */}
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full sm:w-56 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40">
          <Skeleton className="w-3.5 h-3.5 rounded mt-0.5 shrink-0" />
          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─── Notifications Page Skeleton (1:1 with Resident & Collector Notifications) ─── */
export const NotificationsPageSkeleton = () => (
  <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-300">
    {/* Page Header */}
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-72" />
      </div>
    </div>

    {/* Standalone Sliding Category Tabs */}
    <div className="flex items-center gap-1.5 overflow-hidden pb-0.5">
      <Skeleton className="h-9 w-20 rounded-xl shrink-0" />
      <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
      <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
      <Skeleton className="h-9 w-32 rounded-xl shrink-0" />
    </div>

    {/* Right-aligned Sub Actions row */}
    <div className="flex items-center justify-end gap-2 px-1">
      <Skeleton className="h-8 w-28 rounded-xl" />
      <Skeleton className="h-8 w-24 rounded-xl" />
    </div>

    {/* Notifications List of Cards */}
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 shadow-sm"
        >
          <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
            </div>
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Resident Schedule Page Skeleton (1:1 with ResidentSchedule.tsx) ─── */
export const ResidentScheduleSkeleton = () => (
  <div className="w-full max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
    {/* Page Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>
      <Skeleton className="h-9 w-32 rounded-xl" />
    </div>

    {/* Weekly Routine Breakdown (4 cards grid) */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-56 hidden sm:block" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-32" />
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Monthly Interactive Calendar Card */}
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-10 sm:h-14 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

/* ─── My Reports Page Skeleton (1:1 with MyReports.tsx) ─── */
export const MyReportsPageSkeleton = () => (
  <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
    {/* Page Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-44 rounded-xl shrink-0" />
    </div>

    {/* 3 Summary Stat Cards */}
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>

    {/* Search & Filter Toolbar */}
    <div className="space-y-3">
      <Skeleton className="h-11 w-full rounded-2xl" />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
          <Skeleton className="h-9 w-20 rounded-xl shrink-0" />
          <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
          <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
          <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
      </div>
    </div>

    {/* Report Cards List */}
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex items-start gap-3.5 sm:gap-4">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
            <Skeleton className="h-3.5 w-4/5" />
            <div className="flex items-center gap-3 pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Admin Post Detail Skeleton ─── */
export const AdminPostDetailSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-0">
    {/* Back + Edit */}
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>

    {/* Hero image */}
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-[280px] sm:h-[360px]" />
    </div>

    {/* Title */}
    <div className="pt-5 space-y-2">
      <Skeleton className="h-7 sm:h-8 w-3/4" />
      <Skeleton className="h-4 w-40" />
    </div>

    {/* Meta bar */}
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-4 border-b border-border">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
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
        <Skeleton key={i} className="h-7 w-20 rounded-full" />
      ))}
    </div>

  </div>
);

/* ─── Resident Post Detail Skeleton ─── */
export const ResidentPostDetailSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-0">
    {/* Back button */}
    <Skeleton className="h-5 w-32 mb-6" />

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
        <Skeleton key={i} className="h-7 w-20 rounded-full" />
      ))}
    </div>

    {/* Related Posts */}
    <div className="py-8 space-y-4">
      <Skeleton className="h-5 w-28" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-5 w-16 rounded-full" />
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
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  {/* Tags */}
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
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
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
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

/* ─── Submit a Report Form Skeleton (1:1 with ResidentSubmitReport.tsx) ─── */
export const ReportFormSkeleton = () => (
  <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
    {/* Page Header */}
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-72" />
        </div>
      </div>
    </div>

    {/* 2-column flex layout */}
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
      {/* Left Main Form */}
      <div className="flex-1 w-full space-y-4 sm:space-y-5">
        {/* Section 1: Violation Type */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-[220px] w-full rounded-2xl" />
        </div>

        {/* Section 3: Description */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        {/* Section 4: Photos */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>

        {/* Submit Review Button */}
        <Skeleton className="h-14 w-full rounded-2xl mt-2" />
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">
        {/* Step Checklist Card */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Guidelines Card */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
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
            <Skeleton className="h-5 w-20 rounded-full" />
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

/* ─── Route Manager Skeleton (split: list 2/5 + detail 3/5) ─── */
export const RouteManagerSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
    {/* Left: Route List */}
    <div className="lg:col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="bg-card border border-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="w-4 h-4 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>

    {/* Right: Detail/Form Panel */}
    <div className="lg:col-span-3">
      <Card className="border border-dashed border-border h-full min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-3 px-6">
          <Skeleton className="w-14 h-14 rounded-2xl mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-56 mx-auto" />
          <Skeleton className="h-9 w-36 rounded-md mx-auto" />
        </div>
      </Card>
    </div>
  </div>
);

/* ─── Driver Manager Skeleton ─── */
export const DriverManagerSkeleton = () => (
  <div className="space-y-6">
    {/* Search bar */}
    <Skeleton className="h-10 w-full max-w-sm rounded-md" />

    {/* Driver cards grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Analytics Dashboard Skeleton ─── */
export const AnalyticsDashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Filter bar (icon + date preset + divider + barangay + zone + export) */}
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <Skeleton className="h-9 w-[160px] rounded-md" />
        </div>
        <div className="hidden lg:block w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded shrink-0 hidden lg:block" />
          <Skeleton className="h-9 w-[170px] rounded-md" />
        </div>
        <Skeleton className="h-9 w-[140px] rounded-md" />
        <div className="lg:ml-auto">
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>

    {/* Summary KPIs (4 cards) */}
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-16" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>

    {/* Section tabs (5 tabs in pill container) */}
    <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className={`h-10 flex-1 rounded-lg ${i === 0 ? "bg-card border border-border" : ""}`} />
      ))}
    </div>

    {/* Section content (title + subtitle + charts) */}
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <CardGridSkeleton count={4} cols={2} />
    </div>
  </div>
);

/* ─── Audit Logs Skeleton ─── */
export const AuditLogsSkeleton = () => (
  <div className="space-y-5">
    <KPIRowSkeleton count={4} />
    <Card className="p-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-[140px] rounded-md" />
          <Skeleton className="h-10 w-[120px] rounded-md" />
          <Skeleton className="h-10 w-[140px] rounded-md" />
          <Skeleton className="h-10 w-[160px] rounded-md" />
        </div>
      </div>
    </Card>
    <TableSkeleton cols={7} rows={10} />
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
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

/* ─── My Reports Skeleton ─── */
export const MyReportsSkeleton = () => (
  <div className="space-y-4 sm:space-y-6">
    {/* Header */}
    <div>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>

    {/* Stats Summary */}
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border border-border shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Search + Sort */}
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 w-full sm:w-44 rounded-xl" />
    </div>

    {/* Filter Tabs */}
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-xl" />
      ))}
    </div>

    {/* Report Cards */}
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border border-border">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-lg" />
                </div>
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-3 pt-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            {/* Status progress */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-1.5 flex-1 rounded-full" />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-2 w-12" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─── Announcements Page Skeleton ─── */
export const AnnouncementsPageSkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto space-y-6">
    {/* Header */}
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
    </div>

    {/* KPIs */}
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center gap-4">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* Toolbar */}
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-[145px] rounded-md" />
          <Skeleton className="h-10 w-[120px] rounded-md" />
          <Skeleton className="h-10 w-[120px] rounded-md" />
          <Skeleton className="h-10 w-[130px] rounded-md" />
          <Skeleton className="h-10 w-[72px] rounded-lg" />
        </div>
      </div>
    </div>

    {/* Card Grid */}
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="w-8 h-8 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
