import ListEmptyState from "@/components/common/ListEmptyState";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import React, { useState } from "react";
import { notificationStyles } from "@/features/resident/notifications/notificationStyles";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { Bell, CheckCheck, Trash2, ChevronRight, Clock, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PaginationControls from "@/components/common/PaginationControls";
import useNotifications from "@/features/admin/notifications/useAdminNotifications";
import { NotificationRow } from "@/services/notificationsService";
import { useNotificationTime } from "@/hooks/useNotificationTime";
import AdminNotificationModal, {
  AdminNotificationDetail,
} from "./AdminNotificationModal";
import {

  NotificationsPageSkeleton,
} from "@/components/loading/PageLoadingSkeletons";

const PAGE_SIZE = 15;

import { getAdminNotificationDestination, getAdminNotificationPresentation, getNotificationIconAndStyle, type AdminCategory } from "./notificationPresentation";

const tabs: FilterPillItem<AdminCategory>[] = [
  { id: "all", label: "All" },
  { id: "operations", label: "Operations" },
  { id: "reports", label: "Reports" },
  { id: "content", label: "Content" },
  { id: "announcements", label: "Announcements" },
];

const AdminNotifications: React.FC = () => {
  const { formatTime: formatRelativeTime } = useNotificationTime();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminCategory>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const {
    notifications,
    total,
    historyTotal,
    offset,
    unreadCount,
    isLoading,
    isRefreshing,
    hasLoadedData,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    isMarkingAll,
    isClearing,
    isMutating,
  } = useNotifications({ limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE, web_category: activeTab === "all" ? "all" : `admin:${activeTab}` });
  const [modalNotification, setModalNotification] =
    useState<AdminNotificationDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleTabChange = (tab: AdminCategory) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.floor(offset / PAGE_SIZE) + 1, totalPages);
  const paginated = notifications;

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    const destination = getAdminNotificationDestination(n);
    if (destination) {
      navigate(destination);
    } else {
      const { headline, message } = getAdminNotificationPresentation(n);
      setModalNotification({
        id: n.id,
        title: [headline.prefix, headline.connector, headline.highlight].filter(Boolean).join(" "),
        message,
        created_at: n.created_at,
        time: formatRelativeTime(n.created_at, {
          dateOptions: { month: "short", day: "numeric", year: "numeric" },
        }),
        type: n.type,
        ref_module: n.ref_module,
        metadata: n.metadata,
      });
      setModalOpen(true);
    }
  };

  if (isLoading && notifications.length === 0) {
    return <NotificationsPageSkeleton role="admin" />;
  }
  if (error && !hasLoadedData) return <PageErrorState kind="unavailable" description="We couldn't load notifications. Please try again." onRetry={() => void fetchNotifications()} retrying={isRefreshing} homeHref="/admin" />;

  return (
    <div className={notificationStyles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        title="Notifications"
        description="Resident reports, collection updates, and driver messages."
        titleBadge={unreadCount > 0 ? <Badge className="shrink-0 text-[11px] tabular-nums">{unreadCount.toLocaleString()} unread</Badge> : undefined}
        actionsClassName={notificationStyles.headerActions}
        actions={(unreadCount > 0 || historyTotal > 0) && (
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
                <span className="min-w-0 truncate">Mark All Read</span>
              </Button>
            )}
            {historyTotal > 0 && (
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={clearAll}
                disabled={isMutating}
                loading={isClearing}
                loadingLabel="Clearing…"
                className={notificationStyles.actionButton}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="min-w-0 truncate">Clear All</span>
              </Button>
            )}
          </>
        )}
      />

      <div className="space-y-4">
      {/* ── Category filters ── */}
      <div className={notificationStyles.filterRow}>
        <FilterPillTabs<AdminCategory>
          items={tabs}
          activeId={activeTab}
          onChange={handleTabChange}
          ariaLabel="Notification categories"
          className="flex-1 pb-0"
        />

        {(unreadCount > 0 || historyTotal > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={notificationStyles.menuTrigger}
                disabled={isMutating}
                title="Notification Actions"
                aria-label="Notification actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {unreadCount > 0 && (
                <DropdownMenuItem onSelect={markAllAsRead} disabled={isMutating} className="gap-2">
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                  Mark All as Read
                </DropdownMenuItem>
              )}
              {historyTotal > 0 && (
                <DropdownMenuItem onSelect={clearAll} disabled={isMutating} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All Notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && <DataRefreshNotice message="Couldn't refresh notifications. Showing the last loaded notifications, which may be outdated." onRetry={() => void fetchNotifications()} retrying={isRefreshing} />}

      {/* ── Notification List ── */}
      {paginated.length > 0 ? (
        <div className={notificationStyles.list}>
          {paginated.map((n) => {
            const { headline, message } = getAdminNotificationPresentation(n);
            const { Icon, style: avatarStyle } = getNotificationIconAndStyle(n);
            const isUnread = !n.is_read;
            const timeAgo = formatRelativeTime(n.created_at, {
              dateOptions: { month: "short", day: "numeric", year: "numeric" },
            });

            return (
              <button
                type="button"
                key={n.id}
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
                  {isUnread && <span className="sr-only">Unread Notification</span>}
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

                {/* Chevron Right Indicator */}
                <div className={notificationStyles.trailing}>
                  <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <ListEmptyState icon={Bell} title="No Notifications Found"
          description="You're all caught up! New alerts will appear here in real-time." />
      )}

      {/* ── Pagination ── */}
      <PaginationControls mobileLayout="summary" currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} variant="inline" />
      </div>

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
