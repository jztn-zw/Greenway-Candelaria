import React, { useState, useMemo, useRef, useEffect } from "react";
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

const tabs: { key: AdminCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "operations", label: "Operations" },
  { key: "reports", label: "Reports" },
  { key: "content", label: "Content" },
  { key: "announcements", label: "Announcements" },
];

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
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
    return notifications.filter((n) => getAdminCategory(n) === activeTab);
  }, [notifications, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const tabUnread = (cat: AdminCategory) => {
    if (cat === "all") return unreadCount;
    return notifications.filter(
      (n) => !n.is_read && getAdminCategory(n) === cat,
    ).length;
  };

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

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 md:space-y-5 animate-in fade-in duration-300">
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">
          Notifications could not be refreshed. Please try again.
          <Button variant="outline" size="sm" className="ml-3" onClick={() => void fetchNotifications()}>Retry</Button>
        </div>
      )}
      {/* ── Page Header ── */}
      <div className="hidden items-center justify-between gap-4 lg:flex">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20 shadow-2xs">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
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
                className="gap-1.5 text-xs h-9 px-3 rounded-xl border-border/80 bg-card hover:bg-muted/70 text-foreground font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
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
                className="gap-1.5 text-xs h-9 px-3 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold transition-all active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear all</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Category Filter Tabs (Smooth native mobile scroll + slide drag) ── */}
      <div className="flex items-center gap-2">
        <div
          ref={tabsContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 pr-2 scrollbar-hide touch-pan-x select-none cursor-grab active:cursor-grabbing scroll-smooth lg:pr-4"
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
                  : "bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"
              }`}
            >
              <span>{tab.label}</span>
              {isActive && count > 0 && (
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

        {(unreadCount > 0 || notifications.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0 rounded-xl border-border/80 bg-card text-muted-foreground shadow-2xs lg:hidden"
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
                className={`group w-full text-left flex items-start gap-3 p-3.5 transition-all duration-200 cursor-pointer select-none hover:bg-muted/50 active:bg-muted/70 dark:hover:bg-muted/30 md:gap-4 md:p-4 lg:p-5 ${
                  isUnread ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                }`}
              >
                {/* Left Thematic Avatar Icon */}
                <div
                  className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${avatarStyle}`}
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
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-medium pt-1">
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
          <h3 className="text-base font-bold font-display text-foreground">
            No notifications found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You're all caught up! New alerts will appear here in real-time.
          </p>
        </div>
      )}

      {/* ── Pagination ── */}
      <PaginationControls currentPage={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} itemLabel="notifications" onPageChange={setCurrentPage} variant="inline" />

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
