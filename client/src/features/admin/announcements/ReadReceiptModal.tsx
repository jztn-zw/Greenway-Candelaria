import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Eye,
  BarChart3,
  Search,
  X,
  TrendingDown,
} from "lucide-react";
import { Announcement } from "./types";
import {
  fetchReadReceipts,
  type AnnouncementAnalytics,
} from "@/services/announcementsService";

interface Props {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReadReceiptModal = ({ announcement, open, onOpenChange }: Props) => {
  const [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState<AnnouncementAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setSearch("");
    setIsLoading(true);
    setLoadError(null);
    setAnalytics(null);

    fetchReadReceipts(announcement.id)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((error) => {
        console.error("[Read analytics] Failed to load", error);
        if (!cancelled) setLoadError("Analytics could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [announcement.id, open]);

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
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background flex flex-col max-h-[85vh] [&>button:last-child]:hidden">
        {/* ── Fixed Pinned Header (Non-Scrollable) ── */}
        <div className="p-4 sm:p-5 pb-3.5 border-b border-border/60 flex items-center justify-between gap-3 text-left shrink-0 bg-background z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold font-display text-foreground tracking-tight truncate">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1 overscroll-contain">
          {/* ── Executive Summary Metrics ── */}
          <div className="rounded-2xl bg-muted/40 border border-border/80 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
                <p className="text-xl sm:text-2xl font-extrabold font-display text-foreground tabular-nums">
                  {recipientCount.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Delivered
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
                <p className="text-xl sm:text-2xl font-extrabold font-display text-primary tabular-nums">
                  {readCount.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Confirmed Read
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
                <p className="text-xl sm:text-2xl font-extrabold font-display text-foreground tabular-nums">
                  {readPct}%
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  Read Rate
                </p>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Barangay Engagement Breakdown
                </h4>
                <span className="text-[11px] font-medium text-muted-foreground">
                  ({analytics?.barangays.length || 0})
                </span>
              </div>
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Lowest read first
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by barangay name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-xs rounded-xl bg-background border-border"
              />
            </div>

            {/* Barangay List */}
            <ScrollArea className="h-56 rounded-xl border border-border/70 p-2 bg-background/50">
              <div className="space-y-2">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Loading read analytics...
                  </p>
                ) : loadError ? (
                  <p className="text-xs text-destructive text-center py-6">{loadError}</p>
                ) : filteredAndSortedStats.length === 0 ? (
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
                            className={`text-xs font-extrabold tabular-nums px-2 py-0.5 rounded-full border ${
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

                        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground font-medium">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReadReceiptModal;
