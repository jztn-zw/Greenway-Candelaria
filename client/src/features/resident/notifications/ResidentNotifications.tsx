import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { useResidentFetch } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CalendarClock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  FileText,
  Newspaper,
  Trash2,
  Lightbulb,
  CalendarDays,
  Wrench,
  ChevronRight,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useNotifications from "@/features/resident/notifications/useResidentNotifications";
import { NotificationRow } from "@/services/notificationsService";
import PaginationControls from "@/components/common/PaginationControls";
import { formatRelativeTime } from "@/utils/date";
import NotificationModal from "./NotificationModal";
import type { NotificationType, ResidentNotification } from "./types";
import ResidentAnnouncementModal from "../announcements/ResidentAnnouncementModal";
import type { AnnouncementDetail } from "../announcements/ResidentAnnouncementModal";
import { fetchAnnouncementById } from "@/services/announcementsService";
import { fetchLiveTrucks, fetchTodayRoutes } from "@/services/trackingService";
import { toast } from "@/lib/toast";
import {
  NotificationsPageSkeleton,
} from "@/components/PageLoadingSkeletons";

const PAGE_SIZE = 15;

type NotificationCategory = "all" | "collection" | "reports" | "content" | "announcements";

const tabs: FilterPillItem<NotificationCategory>[] = [
  { id: "all", label: "All" },
  { id: "collection", label: "Collection" },
  { id: "reports", label: "Reports" },
  { id: "content", label: "Content" },
  { id: "announcements", label: "Announcements" },
];

const typeCategoryMap: Record<string, NotificationCategory> = {
  COLLECTION_REMINDER: "collection",
  TRUCK_IS_NEAR: "collection",
  COLLECTION_DONE: "collection",
  MISSED_COLLECTION: "collection",
  REPORT_UPDATE: "reports",
  NEW_POST: "content",
  ANNOUNCEMENT: "announcements",
  SYSTEM: "all",
};

const typeIcons: Record<string, React.ElementType> = {
  COLLECTION_REMINDER: CalendarClock,
  TRUCK_IS_NEAR: Truck,
  COLLECTION_DONE: CheckCircle2,
  MISSED_COLLECTION: AlertTriangle,
  ANNOUNCEMENT: Megaphone,
  REPORT_UPDATE: FileText,
  NEW_POST: Newspaper,
  SYSTEM: Bell,
};

const typeLabels: Record<string, string> = {
  COLLECTION_REMINDER: "Collection",
  TRUCK_IS_NEAR: "Truck Near",
  COLLECTION_DONE: "Done",
  MISSED_COLLECTION: "Alert",
  ANNOUNCEMENT: "Announcement",
  REPORT_UPDATE: "Report",
  NEW_POST: "Content",
  SYSTEM: "System",
};

const modalTypeByNotificationType: Record<NotificationRow["type"], NotificationType> = {
  COLLECTION_REMINDER: "collection-reminder",
  TRUCK_IS_NEAR: "truck-near",
  COLLECTION_DONE: "collection-done",
  REPORT_UPDATE: "report-update",
  NEW_POST: "new-content",
  ANNOUNCEMENT: "announcement",
  MISSED_COLLECTION: "missed-collection",
  SYSTEM: "system",
};

const getMetadata = (notification: NotificationRow): Record<string, unknown> => {
  if (!notification.metadata) return {};
  if (typeof notification.metadata === "string") {
    try {
      return JSON.parse(notification.metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return notification.metadata;
};

const isFreshLivePing = (value?: string | null) => {
  if (!value) return false;
  const normalized = /^\d{4}-\d{2}-\d{2}[ T]/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const timestamp = Date.parse(normalized);
  return !Number.isNaN(timestamp) && Date.now() - timestamp <= 120_000;
};

const isActiveTruckNearAlert = async (notification: NotificationRow, fetchResident: ReturnType<typeof useResidentFetch>) => {
  if (notification.type !== "TRUCK_IS_NEAR" || !notification.ref_id) return false;

  try {
    const [routes, liveTrucks] = await Promise.all([fetchResident("tracking", ["today"], fetchTodayRoutes), fetchResident("tracking", ["live"], fetchLiveTrucks)]);
    const route = routes.find((item) => item.route_id === notification.ref_id);
    if (String(route?.route_status || "").toUpperCase() !== "ACTIVE") return false;

    const liveTruck = liveTrucks.find((item) => item.truck_id === route?.truck_id);
    return (
      String(liveTruck?.truck_status || "").toUpperCase() === "ON_THE_WAY" &&
      isFreshLivePing(liveTruck?.last_ping)
    );
  } catch {
    // A failed live check must never send a resident to an outdated tracking view.
    return false;
  }
};

const getNotificationHeadline = (n: NotificationRow) => {
  const cleanTitle = (n.title || "")
    .replace(/🚨|⚠️|⚠/g, "")
    .trim();

  if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
    return {
      prefix: "MENRO Candelaria",
      connector: "posted an announcement:",
      highlight: cleanTitle || "Official Notice",
    };
  }

  return {
    prefix: cleanTitle || "System Notification",
    connector: "",
    highlight: "",
  };
};

const getNotificationIconAndStyle = (n: NotificationRow) => {
  const metadata = getMetadata(n);
  const category = String(metadata.category || "").toUpperCase();

  if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
    return {
      Icon: Megaphone,
      style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }

  if (n.type === "TRUCK_IS_NEAR" || n.ref_module === "tracking") {
    return {
      Icon: Truck,
      style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    };
  }

  if (n.type === "COLLECTION_REMINDER" || category === "SCHEDULE_CHANGE") {
    return {
      Icon: CalendarDays,
      style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    };
  }

  if (n.type === "COLLECTION_DONE") {
    return {
      Icon: CheckCircle2,
      style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }

  if (category === "WASTE_TIP") {
    return {
      Icon: Lightbulb,
      style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }

  if (n.ref_module === "reports" || n.type === "REPORT_UPDATE") {
    return {
      Icon: FileText,
      style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }

  if (n.type === "NEW_POST" || n.ref_module === "posts") {
    return {
      Icon: Newspaper,
      style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
  }

  return {
    Icon: Bell,
    style: "bg-primary/10 text-primary border-primary/20",
  };
};

const ResidentNotifications = () => {
  const fetchResident = useResidentFetch();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    hasLoadedData,
    error: notificationsError,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    isMarkingAll,
    isMutating,
    clearAll,
  } = useNotifications();

  const [searchParams, setSearchParams] = useSearchParams();
  const announcementParam = searchParams.get("announcement");

  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [modalNotification, setModalNotification] = useState<ResidentNotification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<{
    id?: string | null;
    notification?: NotificationRow | null;
    detail?: AnnouncementDetail | null;
  } | null>(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // Sync ?announcement=<id> query parameter from URL
  useEffect(() => {
    if (announcementParam) {
      const match = notifications.find(
        (n) => n.ref_id === announcementParam || n.id === announcementParam
      );
      let cancelled = false;
      void (async () => {
        try {
          const detail = await fetchResident("announcements", ["detail", announcementParam], () => fetchAnnouncementById(announcementParam));
          if (!cancelled) {
            setSelectedAnnouncement({
              id: announcementParam,
              notification: match || null,
              detail: detail as AnnouncementDetail,
            });
            setAnnouncementModalOpen(true);
          }
        } catch {
          if (!cancelled) toast.info("This announcement is no longer available.");
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [announcementParam, notifications, fetchResident]);

  const handleAnnouncementModalChange = (open: boolean) => {
    setAnnouncementModalOpen(open);
    if (!open) {
      setSelectedAnnouncement(null);
      if (searchParams.has("announcement")) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("announcement");
        setSearchParams(nextParams, { replace: true });
      }
    }
  };

  const handleTabChange = (tab: NotificationCategory) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => typeCategoryMap[n.type] === activeTab);
  }, [notifications, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    const openNotificationDetails = () => {
      setModalNotification({
        id: n.id,
        title: n.title,
        message: n.body,
        time: formatRelativeTime(n.created_at, { dateOptions: { month: "short", day: "numeric", year: "numeric" } }),
        type: modalTypeByNotificationType[n.type],
        read: true,
      });
      setModalOpen(true);
    };

    if (n.ref_module === "posts" && n.ref_id) {
      navigate(`/resident/contents?post=${n.ref_id}`);
    } else if (n.ref_module === "reports" && n.ref_id) {
      navigate(`/resident/my-reports?report=${n.ref_id}`);
    } else if (n.ref_module === "tracking") {
      if (await isActiveTruckNearAlert(n, fetchResident)) {
        navigate("/resident/tracking");
      } else {
        openNotificationDetails();
      }
    } else if (n.type === "COLLECTION_REMINDER") {
      openNotificationDetails();
    } else if (n.type === "ANNOUNCEMENT" || n.ref_module === "announcements") {
      // Check availability before opening the modal. Expired announcements are
      // intentionally unavailable to residents, so show only a clear message.
      if (n.ref_id) {
        try {
          const detail = await fetchResident("announcements", ["detail", n.ref_id], () => fetchAnnouncementById(n.ref_id!));
          setSelectedAnnouncement({
            id: n.ref_id,
            notification: n,
            detail: detail as AnnouncementDetail,
          });
          setAnnouncementModalOpen(true);
        } catch {
          toast.info("This announcement is no longer available.");
          void fetchNotifications();
          return;
        }
        return;
      }

      setSelectedAnnouncement({
        id: n.ref_id || n.id,
        notification: n,
        detail: null,
      });
      setAnnouncementModalOpen(true);
    } else if (n.type === "SYSTEM" || n.type === "MISSED_COLLECTION") {
      openNotificationDetails();
    }
  };

  if (isLoading && notifications.length === 0) {
    return <NotificationsPageSkeleton role="resident" />;
  }
  if (notificationsError && !hasLoadedData) return <PageErrorState kind="unavailable" description="We couldn't load notifications. Please try again." onRetry={() => void fetchNotifications()} retrying={isRefreshing} homeHref="/resident" />;

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 md:space-y-5 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="hidden items-center justify-between gap-4 lg:flex">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5 rounded-md border border-primary/20 shadow-2xs">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Stay updated on collection alerts, reports, and municipal announcements
          </p>
        </div>

        {/* Action Buttons in Header */}
        {(unreadCount > 0 || notifications.length > 0) && (
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMutating}
                loading={isMarkingAll}
                loadingLabel="Marking all read…"
                className="gap-1.5 text-xs h-9 px-3 rounded-xl font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                <span>Mark all read</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={() => setConfirmClear(true)}
                className="gap-1.5 text-xs h-9 px-3 rounded-xl border font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear all</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Category filters ── */}
      <div className="flex items-center gap-2">
        <FilterPillTabs<NotificationCategory>
          items={tabs}
          activeId={activeTab}
          onChange={handleTabChange}
          ariaLabel="Notification categories"
          className="flex-1 pr-2 lg:pr-4"
        />

        {(unreadCount > 0 || notifications.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0 rounded-xl shadow-2xs lg:hidden"
                title="Notification actions"
                aria-label="Notification actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 lg:hidden">
              {unreadCount > 0 && (
                <DropdownMenuItem onSelect={markAllAsRead} className="gap-2">
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                  Mark all as read
                </DropdownMenuItem>
              )}
              {notifications.length > 0 && (
                <DropdownMenuItem onSelect={() => setConfirmClear(true)} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {notificationsError && <DataRefreshNotice message="Couldn't refresh notifications. Showing the last loaded notifications, which may be outdated." onRetry={() => void fetchNotifications()} retrying={isRefreshing} />}

      {/* ── Notification List ── */}
      {paginated.length > 0 ? (
        <div className="rounded-2xl border border-border/80 overflow-hidden divide-y divide-border/60 bg-card shadow-2xs">
          {paginated.map((n) => {
            const headline = getNotificationHeadline(n);
            const { Icon, style: avatarStyle } = getNotificationIconAndStyle(n);
            const isUnread = !n.is_read;
            const timeAgo = formatRelativeTime(n.created_at, {
              dateOptions: { month: "short", day: "numeric", year: "numeric" },
            });

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`group flex w-full items-start gap-3 p-3.5 text-left transition-colors cursor-pointer select-none hover:bg-[var(--button-neutral-hover)] active:bg-[var(--button-neutral-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:hover:bg-[var(--button-neutral-hover)] md:gap-4 md:p-4 lg:p-5 ${
                  isUnread ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                }`}
              >
                {/* Left Thematic Avatar Icon */}
                <div
                  className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 ${avatarStyle}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Main Content Area */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Primary text with bold focal points */}
                  <p className="text-sm font-semibold text-foreground/90 leading-snug break-words group-hover:text-primary transition-colors">
                    <span className="font-bold text-foreground">
                      {headline.prefix}
                    </span>
                    {headline.connector && (
                      <span className="text-foreground/80"> {headline.connector} </span>
                    )}
                    {headline.highlight && (
                      <span className="font-bold text-foreground">
                        {headline.highlight}
                      </span>
                    )}
                  </p>

                  {/* Secondary Subtext (preview snippet) */}
                  {n.body && (
                    <p className="break-words pt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-1 lg:line-clamp-2">
                      {n.body}
                    </p>
                  )}

                  {/* Relative Timestamp */}
                  <div className="flex items-center gap-1.5 text-ui-caption text-muted-foreground/80 font-medium pt-1">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    <span>{timeAgo}</span>
                  </div>
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <div className="flex items-center self-center shrink-0 pl-1" title="Unread notification">
                    <span className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/15 shadow-xs" />
                  </div>
                )}

                {/* Chevron Right Indicator */}
                <div className="flex items-center self-center shrink-0 pl-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/50 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="gw-heading text-base text-foreground">
            No notifications found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You're all caught up! New alerts will appear here in real-time.
          </p>
        </div>
      )}

      {/* ── Pagination ── */}
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} variant="inline" />

      {/* ── Modal for Announcements ── */}
      <ConfirmationDialog open={confirmClear} onOpenChange={setConfirmClear} title="Clear all notification history?"
        description="This permanently deletes notifications in every category. This cannot be undone."
        icon={<Trash2 />} variant="destructive" confirmLabel="Clear all" isPending={isClearing} pendingLabel="Clearing..."
        onConfirm={async () => {
          if (isClearing) return;
          setIsClearing(true);
          try { await clearAll(); setCurrentPage(1); setConfirmClear(false); }
          finally { setIsClearing(false); }
        }} />
      <ResidentAnnouncementModal
        open={announcementModalOpen}
        onOpenChange={handleAnnouncementModalChange}
        announcementId={selectedAnnouncement?.id}
        initialAnnouncement={selectedAnnouncement?.detail}
        notification={selectedAnnouncement?.notification}
        onMarkRead={markAsRead}
      />

      {/* ── Modal for Generic & System Details ── */}
      {modalNotification && (
        <NotificationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          notification={modalNotification}
          onViewSchedule={() => {
            setModalOpen(false);
            navigate("/resident/schedule");
          }}
        />
      )}
    </div>
  );
};

export default ResidentNotifications;
