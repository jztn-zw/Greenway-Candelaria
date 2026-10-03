import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { Badge } from "@/components/ui/badge";
import { notificationStyles } from "./notificationStyles";
import { getResidentNotificationPresentation } from "./notificationPresentation";
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
      const { headline, message } = getResidentNotificationPresentation(n);
      setModalNotification({
        id: n.id,
        title: [headline.prefix, headline.connector, headline.highlight].filter(Boolean).join(" "),
        message,
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
    <div className={notificationStyles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader title="Notifications" description="Collection alerts, report updates, and community notices."
        titleBadge={unreadCount > 0 ? <Badge className="shrink-0 text-[11px] tabular-nums">{unreadCount.toLocaleString()} unread</Badge> : undefined}
        actionsClassName={notificationStyles.headerActions}
        actions={(unreadCount > 0 || notifications.length > 0) && (
          <>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMutating}
                loading={isMarkingAll}
                loadingLabel="Marking…"
                className={notificationStyles.actionButton}
              >
                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                <span className="min-w-0 truncate">Mark all read</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={() => setConfirmClear(true)}
                disabled={isMutating}
                className={notificationStyles.actionButton}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="min-w-0 truncate">Clear all</span>
              </Button>
            )}
          </>
        )}
      />

      <div className="space-y-4">

      {/* ── Category filters ── */}
      <div className={notificationStyles.filterRow}>
        <FilterPillTabs<NotificationCategory>
          items={tabs}
          activeId={activeTab}
          onChange={handleTabChange}
          ariaLabel="Notification categories"
          className="flex-1 pb-0"
        />

        {(unreadCount > 0 || notifications.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={notificationStyles.menuTrigger}
                disabled={isMutating}
                title="Notification actions"
                aria-label="Notification actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {unreadCount > 0 && (
                <DropdownMenuItem onSelect={markAllAsRead} disabled={isMutating} className="gap-2">
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                  Mark all as read
                </DropdownMenuItem>
              )}
              {notifications.length > 0 && (
                <DropdownMenuItem onSelect={() => setConfirmClear(true)} disabled={isMutating} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
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
        <div className={notificationStyles.list}>
          {paginated.map((n) => {
            const { headline, message } = getResidentNotificationPresentation(n);
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
                className={`${notificationStyles.row} ${
                  isUnread ? "border-l-primary bg-primary/[0.04]" : "border-l-transparent"
                }`}
              >
                {/* Left Thematic Avatar Icon */}
                <div
                  className={`${notificationStyles.icon} ${avatarStyle}`}
                >
                  <Icon aria-hidden="true" />
                </div>

                {/* Main Content Area */}
                <div className="min-w-0 flex-1 space-y-1">
                  {isUnread && <span className="sr-only">Unread notification</span>}
                  {/* Primary text with bold focal points */}
                  <p className="text-sm font-semibold text-foreground/90 leading-snug break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors">
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
                  {message && (
                    <p className={notificationStyles.message}>
                      {message}
                    </p>
                  )}

                  {/* Relative Timestamp */}
                  <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-muted-foreground/80 pt-1">
                    <Clock className="size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                    <span>{timeAgo}</span>
                  </div>
                </div>

                <div className={notificationStyles.trailing}>
                  <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-12 text-center border border-dashed border-border/80 rounded-2xl bg-card/50">
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
      </div>

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
