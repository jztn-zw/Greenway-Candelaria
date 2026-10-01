import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";
import PaginationControls from "@/components/common/PaginationControls";
import { formatRelativeTime } from "@/utils/date";
import CollectorNotificationModal from "./CollectorNotificationModal";
import { NotificationsListSkeleton, NotificationsPageSkeleton } from "@/components/PageLoadingSkeletons";
import {
  getCollectorNotificationCategory,
  openCollectorNotification,
  getCollectorNotificationTitle,
  getCollectorNotificationVisual,
} from "./notificationRouting";

const PAGE_SIZE = 15;

type CollectorCategory = "all" | "routes" | "dispatch" | "announcements";

const tabs: { key: CollectorCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "routes", label: "Routes & Stops" },
  { key: "dispatch", label: "Dispatch Alerts" },
  { key: "announcements", label: "Announcements" },
];

const CollectorNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    category, clearAll, error, isMutating, nextCursor, loadMore, fetchNotifications, total,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<CollectorCategory>(category);
  const [modalNotification, setModalNotification] = useState<NotificationRow | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const hasShownFeed = useRef(false);

  useEffect(() => {
    if (!isLoading) hasShownFeed.current = true;
  }, [isLoading]);

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

  const handleTabClick = (tab: CollectorCategory, e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0 && hasDraggedRef.current) { hasDraggedRef.current = false; return; }
    setActiveTab(tab);
    void fetchNotifications({ category: tab });
    setCurrentPage(1);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => getCollectorNotificationCategory(n) === activeTab);
  }, [notifications, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);

  const handleClick = (n: NotificationRow) => {
    if (!n.is_read) {
      void markAsRead(n.id);
    }

    if (openCollectorNotification(n, navigate)) return;
    setModalNotification(n);
    setModalOpen(true);
  };

  if (isLoading && notifications.length === 0 && !hasShownFeed.current) {
    return <NotificationsPageSkeleton role="collector" />;
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 md:space-y-5 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="hidden items-center justify-between gap-4 lg:flex">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">Notifications</h1>
            {unreadCount > 0 && <span className="bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5 rounded-md border border-primary/20 shadow-2xs">{unreadCount} unread</span>}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Live route alerts, dispatch updates, and municipal announcements</p>
        </div>
        {(unreadCount > 0 || notifications.length > 0) && (
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && <Button variant="outline" size="sm" disabled={isMutating} onClick={() => void markAllAsRead()} className="gap-1.5 text-xs h-9 px-3 rounded-xl font-semibold shadow-2xs transition-all cursor-pointer"><CheckCheck className="w-3.5 h-3.5 text-primary" /><span>Mark all read</span></Button>}
            {notifications.length > 0 && <Button variant="destructive-outline" size="sm" disabled={isMutating} onClick={() => setConfirmClear(true)} className="gap-1.5 text-xs h-9 px-3 rounded-xl border font-semibold transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5" /><span>Clear all</span></Button>}
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
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={(e) => handleTabClick(tab.key, e)}
              className={`group h-9 px-3.5 rounded-lg text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 border cursor-pointer ${isActive ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-semibold" : "bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"}`}
            >
              <span>{tab.label}</span>
            </button>
          );
          })}
        </div>
        {(unreadCount > 0 || notifications.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9 shrink-0 rounded-xl shadow-2xs lg:hidden" title="Notification actions" aria-label="Notification actions"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 lg:hidden">
              {unreadCount > 0 && <DropdownMenuItem disabled={isMutating} onSelect={() => void markAllAsRead()} className="gap-2"><CheckCheck className="h-3.5 w-3.5 text-primary" />Mark all as read</DropdownMenuItem>}
              {notifications.length > 0 && <DropdownMenuItem disabled={isMutating} onSelect={() => setConfirmClear(true)} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="h-3.5 w-3.5" />Clear all notifications</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4"><p>{error}</p><Button variant="outline" disabled={isLoading} onClick={() => void fetchNotifications({ category: activeTab })}>Retry</Button></div>}
      {/* ── Notification List ── */}
      {isLoading && notifications.length === 0 ? (
        <NotificationsListSkeleton />
      ) : paginated.length > 0 ? (
        <div className="rounded-2xl border border-border/80 overflow-hidden divide-y divide-border/60 bg-card shadow-2xs">
          {paginated.map((n) => {
            const { Icon, style: iconStyle } = getCollectorNotificationVisual(n);
            const title = getCollectorNotificationTitle(n);
            const isUnread = !n.is_read;
            return (
              <button
                type="button"
                key={n.id}
                disabled={isMutating}
                onClick={() => handleClick(n)}
                className={`group w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary flex items-start gap-3 p-3.5 transition-all duration-200 cursor-pointer select-none hover:bg-[var(--button-neutral-hover)] active:bg-[var(--button-neutral-active)] dark:hover:bg-[var(--button-neutral-hover)] md:gap-4 md:p-4 lg:p-5 ${
                  isUnread ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                }`}
              >
                <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 ${iconStyle}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`text-sm leading-snug break-words group-hover:text-primary transition-colors ${isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}>{title}</p>
                  {n.body && <p className="break-words pt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-1 lg:line-clamp-2">{n.body}</p>}
                  <div className="flex items-center gap-1.5 text-ui-caption text-muted-foreground/80 font-medium pt-1">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    <span>{formatRelativeTime(n.created_at)}</span>
                  </div>
                </div>

                {isUnread && (
                  <div className="flex items-center self-center shrink-0 pl-1" title="Unread notification"><span className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/15 shadow-xs" /></div>
                )}
                <div className="flex items-center self-center shrink-0 pl-1"><ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" /></div>
              </button>
            );
          })}
        </div>
      ) : !error && !isLoading ? (
        <div className="p-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/50 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary"><Bell className="w-6 h-6" /></div>
          <h3 className="gw-heading text-base text-foreground">
            No driver alerts found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Route dispatches, messages, and system updates will appear here in real-time.
          </p>
        </div>
      ) : null}

      {/* ── Pagination ── */}
      <PaginationControls currentPage={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} itemLabel="notifications" onPageChange={setCurrentPage} variant="inline" />

      {nextCursor && <Button variant="outline" disabled={isLoading || isMutating} onClick={() => void loadMore()}>{isLoading ? "Loading…" : `Load older notifications (${notifications.length} of ${total} loaded)`}</Button>}
      <ConfirmationDialog open={confirmClear} onOpenChange={setConfirmClear}
        title="Clear all notification history?"
        description="This permanently deletes notifications in every category, including older notifications. This cannot be undone."
        icon={<Trash2 />} variant="destructive" confirmLabel="Clear all" isPending={isMutating}
        closeOnConfirm onConfirm={() => { setCurrentPage(1); void clearAll(); }} />
      {/* ── Details Modal ── */}
      {modalNotification && (
        <CollectorNotificationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          notification={modalNotification}
        />
      )}
    </div>
  );
};

export default CollectorNotifications;
