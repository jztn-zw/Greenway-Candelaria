import { useState, useMemo, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";
import PaginationControls from "@/components/common/PaginationControls";
import { formatRelativeTime } from "@/utils/date";
import NotificationModal from "./NotificationModal";
import ResidentAnnouncementModal from "../announcements/ResidentAnnouncementModal";
import type { AnnouncementDetail } from "../announcements/ResidentAnnouncementModal";
import { fetchAnnouncementById } from "@/services/announcementsService";
import { toast } from "sonner";
import {
  PageHeaderSkeleton,
  NotificationsPageSkeleton,
} from "@/components/PageLoadingSkeletons";

const PAGE_SIZE = 15;

type NotificationCategory = "all" | "collection" | "reports" | "content" | "announcements";

const tabs: { key: NotificationCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "collection", label: "Collection" },
  { key: "reports", label: "Reports" },
  { key: "content", label: "Content" },
  { key: "announcements", label: "Announcements" },
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

const getNotificationHeadline = (n: NotificationRow) => {
  const metadata = getMetadata(n);
  const cleanTitle = (n.title || "").replace(/[🚨⚠️]/g, "").trim();
  const category = String(metadata.category || "").toUpperCase();

  if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
    return {
      prefix: "MENRO Candelaria",
      connector: "posted an announcement:",
      highlight: cleanTitle || "Official Notice",
    };
  }

  if (n.ref_module === "reports" || n.type === "REPORT_UPDATE") {
    return {
      prefix: "Report Status Update:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.ref_module === "tracking" || n.type === "TRUCK_IS_NEAR") {
    return {
      prefix: "Collection Truck Alert:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.type === "COLLECTION_REMINDER") {
    return {
      prefix: "Collection Reminder:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.type === "COLLECTION_DONE") {
    return {
      prefix: "Collection Completed:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (category === "WASTE_TIP") {
    return {
      prefix: "Eco Tip:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (category === "SCHEDULE_CHANGE") {
    return {
      prefix: "Schedule Notice:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.type === "NEW_POST" || n.ref_module === "posts") {
    return {
      prefix: "Community Content:",
      connector: "",
      highlight: cleanTitle,
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
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [searchParams, setSearchParams] = useSearchParams();
  const announcementParam = searchParams.get("announcement");

  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [modalNotification, setModalNotification] = useState<{
    id: string;
    title: string;
    message: string;
    time: string;
    type: any;
    details?: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<{
    id?: string | null;
    notification?: NotificationRow | null;
    detail?: AnnouncementDetail | null;
  } | null>(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // Refresh when this page opens so notifications whose announcements expired
  // while the resident kept the app open are removed immediately.
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Sync ?announcement=<id> query parameter from URL
  useEffect(() => {
    if (announcementParam) {
      const match = notifications.find(
        (n) => n.ref_id === announcementParam || n.id === announcementParam
      );
      let cancelled = false;
      void (async () => {
        try {
          const detail = await fetchAnnouncementById(announcementParam);
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
  }, [announcementParam, notifications]);

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

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - tabsContainerRef.current.offsetLeft;
    scrollLeftRef.current = tabsContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tabsContainerRef.current) return;
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    tabsContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTabClick = (tab: NotificationCategory, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDraggedRef.current) return;
    setActiveTab(tab);
    setCurrentPage(1);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
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

  const tabUnread = (cat: NotificationCategory) => {
    if (cat === "all") return unreadCount;
    return notifications.filter(
      (n) => !n.is_read && typeCategoryMap[n.type] === cat,
    ).length;
  };

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    if (n.ref_module === "posts" && n.ref_id) {
      navigate(`/resident/contents?post=${n.ref_id}`);
    } else if (n.ref_module === "reports" && n.ref_id) {
      navigate(`/resident/my-reports?report=${n.ref_id}`);
    } else if (n.ref_module === "tracking") {
      navigate("/resident/schedule");
    } else if (n.type === "ANNOUNCEMENT" || n.ref_module === "announcements") {
      // Check availability before opening the modal. Expired announcements are
      // intentionally unavailable to residents, so show only a clear message.
      if (n.ref_id) {
        try {
          const detail = await fetchAnnouncementById(n.ref_id);
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
      setModalNotification({
        id: n.id,
        title: n.title,
        message: n.body,
        time: formatRelativeTime(n.created_at, { dateOptions: { month: "short", day: "numeric", year: "numeric" } }),
        type: n.type.toLowerCase().replace("_", "-") as any,
      });
      setModalOpen(true);
    }
  };

  if (isLoading && notifications.length === 0) {
    return <NotificationsPageSkeleton />;
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Stay updated on collection alerts, reports, and municipal announcements
          </p>
        </div>
      </div>

      {/* ── Category Filter Tabs (Smooth native mobile scroll + slide drag) ── */}
      <div
        ref={tabsContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pr-4 -mx-1 px-1 touch-pan-x select-none cursor-grab active:cursor-grabbing scroll-smooth"
      >
        {tabs.map((tab) => {
          const count = tabUnread(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={(e) => handleTabClick(tab.key, e)}
              className={`group h-9 px-3.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 active:scale-95 border cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-bold"
                  : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground font-semibold"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold leading-none rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    count > 9 ? "h-5 min-w-5 px-1.5" : "w-5 h-5"
                  } ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Actions Row below Category Tabs (Right-aligned: Mark all read & Clear all) ── */}
      {(unreadCount > 0 || notifications.length > 0) && (
        <div className="flex items-center justify-end gap-2 px-1">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1.5 text-xs h-8 px-3 rounded-xl border-border/80 bg-card hover:bg-muted/60 text-foreground font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
              <span>Mark all read</span>
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-1.5 text-xs h-8 px-3 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold transition-all active:scale-[0.98] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </Button>
          )}
        </div>
      )}

      {/* ── Notification List (Facebook-style feed) ── */}
      {paginated.length > 0 ? (
        <Card className="rounded-2xl border border-border overflow-hidden divide-y divide-border/60 bg-card shadow-2xs">
          {paginated.map((n) => {
            const headline = getNotificationHeadline(n);
            const { Icon, style: avatarStyle } = getNotificationIconAndStyle(n);
            const isUnread = !n.is_read;
            const timeAgo = formatRelativeTime(n.created_at, {
              dateOptions: { month: "short", day: "numeric", year: "numeric" },
            });

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group p-4 sm:p-4.5 flex items-start gap-3.5 sm:gap-4 hover:bg-muted/40 transition-all duration-200 cursor-pointer ${
                  isUnread ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                }`}
              >
                {/* Left Thematic Avatar Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${avatarStyle}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Main Content Area */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Primary text with bold focal points */}
                  <p className="text-sm text-foreground/90 leading-snug break-words">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">
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

                  {/* Secondary Subtext (Facebook-style preview snippet) */}
                  {n.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words pt-0.5">
                      {n.body}
                    </p>
                  )}

                  {/* Relative Timestamp */}
                  <p className="text-[11px] text-muted-foreground/80 font-medium pt-0.5">
                    {timeAgo}
                  </p>
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <div className="flex items-center self-center shrink-0 pl-1" title="Unread notification">
                    <span className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/15 shadow-xs" />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ) : (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            No notifications found
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            You're all caught up! New alerts will appear here in real-time.
          </p>
        </div>
      )}

      {/* ── Pagination ── */}
      <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} itemLabel="notifications" onPageChange={setCurrentPage} />

      {/* ── Modal for Announcements ── */}
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
          notification={modalNotification as any}
        />
      )}
    </div>
  );
};

export default ResidentNotifications;
