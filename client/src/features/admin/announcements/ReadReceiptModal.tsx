import KpiValue from "@/components/common/KpiValue";
import { SearchInput } from "@/components/common/SearchInput";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import {
Dialog,
DialogContent,
DialogDescription,
DialogTitle
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminQuery } from "@/lib/adminQuery";
import {
fetchReadReceipts
} from "@/services/announcementsService";
import {
BarChart3,
Eye,
TrendingDown,
Users,
X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Announcement } from "./types";

interface Props {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReadAnalyticsSkeleton = () => (
  <div role="status" aria-busy="true" className="space-y-4">
    <div aria-hidden="true" className="space-y-4">
      <div className="rounded-2xl bg-muted/40 border border-border/80 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`min-w-0 rounded-xl border border-border/60 bg-background p-3 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <Skeleton className="mx-auto h-7 w-12 max-w-full" /><Skeleton className="mx-auto mt-1 h-4 w-16 max-w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex justify-between gap-2"><Skeleton className="h-4 w-32 max-w-[60%]" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="flex flex-wrap justify-between gap-2"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-24" /></div>
        <Skeleton className="h-11 md:h-9 w-full rounded-xl" />
        <div className="h-56 space-y-2 overflow-hidden rounded-xl border border-border/70 bg-background/50 p-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border/80 bg-card p-3">
              <div className="flex justify-between gap-2"><Skeleton className="h-4 w-28 max-w-[70%]" /><Skeleton className="h-5 w-10 rounded-md" /></div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="flex justify-between gap-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-12" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <span className="sr-only">Loading read analytics…</span>
  </div>
);

const ReadReceiptModal = ({ announcement, open, onOpenChange }: Props) => {
  const [search, setSearch] = useState("");
  const query = useAdminQuery("announcements", ["receipts", announcement.id], () => fetchReadReceipts(announcement.id), { enabled: open });
  const analytics = query.data;
  const isLoading = query.isLoading;
  const loadError = query.error ? "Analytics could not be loaded. Please try again." : null;
  useEffect(() => { if (open) setSearch(""); }, [announcement.id, open]);

  // Filter & sort by lowest read rate first
  const filteredAndSortedStats = useMemo(() => {
    return [...(analytics?.barangays || [])]
      .filter((stat) =>
        stat.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
      .sort((a, b) => {
        const rateA = a.received > 0 ? a.read / a.received : 0;
        const rateB = b.received > 0 ? b.read / b.received : 0;
        return rateA - rateB;
      });
  }, [analytics?.barangays, search]);

  const recipientCount = analytics?.recipients ?? 0;
  const readCount = analytics?.read_count ?? 0;
  const unreadCount = analytics?.unread_count ?? 0;
  const readPct = recipientCount > 0 ? Math.round((readCount / recipientCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] sm:max-w-lg p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background flex flex-col max-h-[90dvh] sm:max-h-[85dvh] [&>button:last-child]:hidden">
        {/* ── Fixed Pinned Header (Non-Scrollable) ── */}
        <div className="gw-modal-header p-4 sm:p-5 pb-3.5 border-b border-border/60 flex items-center justify-between gap-3 text-left shrink-0 bg-background z-10 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="gw-heading break-words text-base sm:text-lg text-foreground tracking-tight">
                Broadcast & Read Analytics
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {announcement.title}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="min-h-0 min-w-0 overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 overscroll-contain">
          {isLoading && !analytics ? <ReadAnalyticsSkeleton /> : loadError && !analytics ? <PageErrorState kind="unavailable" variant="section" title="Read analytics couldn't load" onRetry={() => void query.refetch()} retrying={query.isFetching} /> : <>
          {loadError && <DataRefreshNotice message="Couldn't refresh read analytics. Showing the last loaded results, which may be outdated." onRetry={() => void query.refetch()} retrying={query.isFetching} />}
          {/* ── Executive Summary Metrics ── */}
          <div className="rounded-2xl bg-muted/40 border border-border/80 p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
              <div className="min-w-0 p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
                <p className="gw-stat-value text-xl sm:text-2xl text-foreground tabular-nums"><KpiValue value={recipientCount.toLocaleString()} /></p>
                <p className="text-ui-overline sm:text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Delivered
                </p>
              </div>

              <div className="min-w-0 p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
                <p className="gw-stat-value text-xl sm:text-2xl text-primary tabular-nums"><KpiValue value={readCount.toLocaleString()} /></p>
                <p className="text-ui-overline sm:text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Confirmed Read
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 min-w-0 p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
                <p className="gw-stat-value text-xl sm:text-2xl text-foreground tabular-nums"><KpiValue value={String(readPct) + "%"} /></p>
                <p className="text-ui-overline sm:text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Read Rate
                </p>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground font-medium">
                <span>Overall Read Progress</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {unreadCount.toLocaleString()} unread
                </span>
              </div>
              <Progress value={readPct} className="h-2 rounded-full" />
            </div>
          </div>

          {/* ── Barangay Breakdown ── */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h4 className="gw-heading text-xs text-foreground uppercase tracking-wider">
                  Barangay Engagement Breakdown
                </h4>
                <span className="text-ui-caption font-medium text-muted-foreground">
                  ({analytics?.barangays.length || 0})
                </span>
              </div>
              <span className="text-ui-overline font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Lowest read first
              </span>
            </div>

            {/* Search Input */}
            <SearchInput
              placeholder="Filter by barangay name..."
              value={search}
              onChange={setSearch}
            />

            {/* Barangay List */}
            <ScrollArea className="h-56 rounded-xl border border-border/70 p-2 bg-background/50">
              <div className="space-y-2">
                {filteredAndSortedStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No delivered recipients match your search.
                  </p>
                ) : (
                  filteredAndSortedStats.map((stat) => {
                    const rate =
                      stat.received > 0
                        ? Math.round((stat.read / stat.received) * 100)
                        : 0;
                    const isLow = rate < 40;
                    const isGood = rate >= 70;

                    return (
                      <div
                        key={stat.name}
                        className={`p-3 rounded-xl border transition-colors ${
                          isLow
                            ? "bg-destructive/5 border-destructive/20"
                            : "bg-card border-border/80 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-foreground truncate">
                            {stat.name}
                          </span>
                          <span
                            className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md border ${
                              isGood
                                ? "bg-primary/10 text-primary border-primary/20"
                                : isLow
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {rate}%
                          </span>
                        </div>

                        <Progress
                          value={rate}
                          className="h-1.5 rounded-full"
                        />

                        <div className="flex items-center justify-between mt-2 text-ui-caption text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            {stat.received.toLocaleString()} recipients
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Eye className="w-3 h-3 text-primary" />
                            {stat.read.toLocaleString()} read
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReadReceiptModal;
