import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import React, { useState, useMemo, useEffect } from "react";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { Bell, CheckCheck, Trash2, ChevronRight, Clock, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PaginationControls from "@/components/common/PaginationControls";
import useNotifications from "@/features/admin/notifications/useAdminNotifications";
import { NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime } from "@/utils/date";
import AdminNotificationModal, {
  AdminNotificationDetail,
} from "./AdminNotificationModal";
import {

  NotificationsPageSkeleton,
} from "@/components/PageLoadingSkeletons";

const PAGE_SIZE = 15;

import { getAdminCategory, getAdminNotificationDestination, getNotificationHeadline, getNotificationIconAndStyle, type AdminCategory } from "./notificationPresentation";

const tabs: FilterPillItem<AdminCategory>[] = [
  { id: "all", label: "All" },
  { id: "operations", label: "Operations" },
  { id: "reports", label: "Reports" },
  { id: "content", label: "Content" },
  { id: "announcements", label: "Announcements" },
];

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
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
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<AdminCategory>("all");
  const [modalNotification, setModalNotification] =
    useState<AdminNotificationDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleTabChange = (tab: AdminCategory) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => getAdminCategory(n) === activeTab);
  }, [notifications, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    const destination = getAdminNotificationDestination(n);
    if (destination) {
      navigate(destination);
    } else {
      setModalNotification({
        id: n.id,
        title: getNotificationHeadline(n).prefix,
        message: n.body,
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
            Stay updated on resident reports, collection operations, and driver messages
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
                onClick={clearAll}
                disabled={isMutating}
                loading={isClearing}
                loadingLabel="Clearing notifications…"
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
        <FilterPillTabs<AdminCategory>
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
                <DropdownMenuItem onSelect={clearAll} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && <DataRefreshNotice message="Couldn't refresh notifications. Showing the last loaded notifications, which may be outdated." onRetry={() => void fetchNotifications()} retrying={isRefreshing} />}

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
                type="button"
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group w-full text-left flex items-start gap-3 p-3.5 transition-all duration-200 cursor-pointer select-none hover:bg-[var(--button-neutral-hover)] active:bg-[var(--button-neutral-active)] dark:hover:bg-[var(--button-neutral-hover)] md:gap-4 md:p-4 lg:p-5 ${
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
      <PaginationControls currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} variant="inline" />

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
