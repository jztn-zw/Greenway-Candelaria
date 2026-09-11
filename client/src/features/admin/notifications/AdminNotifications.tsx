import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PaginationControls from "@/components/common/PaginationControls";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime } from "@/utils/date";
import AdminNotificationModal, {
  AdminNotificationDetail,
} from "./AdminNotificationModal";
import {
  PageHeaderSkeleton,
  NotificationsPageSkeleton,
} from "@/components/PageLoadingSkeletons";

const PAGE_SIZE = 10;

type AdminCategory =
  | "all"
  | "operations"
  | "reports"
  | "content"
  | "announcements";

const tabs: { key: AdminCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "operations", label: "Operations" },
  { key: "reports", label: "Reports" },
  { key: "content", label: "Content" },
  { key: "announcements", label: "Announcements" },
];

const typeCategoryMap: Record<string, AdminCategory> = {
  COLLECTION_REMINDER: "operations",
  TRUCK_IS_NEAR: "operations",
  COLLECTION_DONE: "operations",
  MISSED_COLLECTION: "operations",
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
  TRUCK_IS_NEAR: "Fleet",
  COLLECTION_DONE: "Done",
  MISSED_COLLECTION: "Alert",
  ANNOUNCEMENT: "Announcement",
  REPORT_UPDATE: "Report",
  NEW_POST: "Content",
  SYSTEM: "System",
};

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<AdminCategory>("all");
  const [modalNotification, setModalNotification] =
    useState<AdminNotificationDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleTabClick = (
    tab: AdminCategory,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
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

  const tabUnread = (cat: AdminCategory) => {
    if (cat === "all") return unreadCount;
    return notifications.filter(
      (n) => !n.is_read && typeCategoryMap[n.type] === cat,
    ).length;
  };

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    if ((n.ref_module === "reports" || n.type === "REPORT_UPDATE") && n.ref_id) {
      navigate(`/admin/reports?report=${encodeURIComponent(n.ref_id)}`);
    } else if (n.ref_module === "reports" || n.type === "REPORT_UPDATE") {
      navigate("/admin/reports");
    } else if (n.ref_module === "posts" || n.type === "NEW_POST") {
      navigate(n.ref_id ? `/admin/posts?post=${n.ref_id}` : "/admin/posts");
    } else if (
      n.ref_module === "tracking" ||
      n.type === "TRUCK_IS_NEAR" ||
      n.type === "MISSED_COLLECTION" ||
      n.type === "COLLECTION_DONE"
    ) {
      navigate("/admin/tracking");
    } else {
      setModalNotification({
        id: n.id,
        title: n.title,
        message: n.body,
        time: formatRelativeTime(n.created_at, {
          dateOptions: { month: "short", day: "numeric", year: "numeric" },
        }),
        type: n.type,
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
      <div className="pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time municipal alerts, waste reports, route status, and broadcasts
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

      {/* ── Notification List ── */}
      {paginated.length > 0 ? (
        <Card className="rounded-2xl border border-border overflow-hidden divide-y divide-border/60">
          {paginated.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const isUnread = !n.is_read;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-muted/40 transition-colors cursor-pointer ${
                  isUnread ? "bg-primary/[0.03]" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        {typeLabels[n.type] || "Alert"}
                      </span>
                      <h3
                        className={`text-sm font-semibold truncate ${
                          isUnread
                            ? "text-foreground font-bold"
                            : "text-foreground/90"
                        }`}
                      >
                        {n.title}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeTime(n.created_at, {
                        dateOptions: {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {n.body}
                  </p>
                </div>

                {isUnread && (
                  <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-3" />
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
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          itemLabel="notifications"
          onPageChange={setCurrentPage}
          variant="floating"
        />
      )}

      {/* ── Modal for Announcements & System Details ── */}
      {modalNotification && (
        <AdminNotificationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          notification={modalNotification}
        />
      )}
    </div>
  );
};

export default AdminNotifications;
