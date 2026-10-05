import ListEmptyState from "@/components/common/ListEmptyState";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { Badge } from "@/components/ui/badge";
import { notificationStyles } from "@/features/resident/notifications/notificationStyles";
import { getCollectorNotificationPresentation } from "./notificationPresentation";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { useState, useMemo, useRef, useEffect } from "react";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
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
  getCollectorNotificationVisual,
} from "./notificationRouting";

const PAGE_SIZE = 15;

type CollectorCategory = "all" | "routes" | "dispatch" | "announcements";

const tabs: FilterPillItem<CollectorCategory>[] = [
  { id: "all", label: "All" },
  { id: "routes", label: "Routes & Stops" },
  { id: "dispatch", label: "Dispatch Alerts" },
  { id: "announcements", label: "Announcements" },
];

const CollectorNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    hasLoadedData,
    markAsRead,
    markAllAsRead,
    isMarkingAll,
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

  const handleTabChange = (tab: CollectorCategory) => {
    setActiveTab(tab);
    void fetchNotifications({ category: tab });
    setCurrentPage(1);
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
  if (error && !hasLoadedData) return <PageErrorState kind="unavailable" description="We couldn't load notifications. Please try again." onRetry={() => void fetchNotifications({ category: activeTab })} retrying={isRefreshing} homeHref="/collector" />;

  return (
    <div className={notificationStyles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader title="Notifications" description="Route alerts, dispatch messages, and announcements."
        titleBadge={unreadCount > 0 ? <Badge className="shrink-0 text-[11px] tabular-nums">{unreadCount.toLocaleString()} unread</Badge> : undefined}
        actionsClassName={notificationStyles.headerActions}
        actions={(unreadCount > 0 || notifications.length > 0) && <>
          {unreadCount > 0 && <Button variant="outline" size="sm" disabled={isMutating} loading={isMarkingAll} loadingLabel="Marking…" onClick={() => void markAllAsRead()} className={notificationStyles.actionButton}><CheckCheck className="size-3.5 text-primary" /><span className="min-w-0 truncate">Mark all read</span></Button>}
          {notifications.length > 0 && <Button variant="destructive-outline" size="sm" disabled={isMutating} onClick={() => setConfirmClear(true)} className={notificationStyles.actionButton}><Trash2 className="size-3.5" /><span className="min-w-0 truncate">Clear all</span></Button>}
        </>} />

      <div className="space-y-4">
        {/* ── Category filters ── */}
        <div className={notificationStyles.filterRow}>
          <FilterPillTabs<CollectorCategory>
            items={tabs}
            activeId={activeTab}
            onChange={handleTabChange}
            ariaLabel="Notification categories"
            className="flex-1 pb-0"
          />
          {(unreadCount > 0 || notifications.length > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className={notificationStyles.menuTrigger} title="Notification actions" aria-label="Notification actions"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {unreadCount > 0 && <DropdownMenuItem disabled={isMutating} onSelect={() => void markAllAsRead()} className="gap-2"><CheckCheck className="h-3.5 w-3.5 text-primary" />Mark all as read</DropdownMenuItem>}
                {notifications.length > 0 && <DropdownMenuItem disabled={isMutating} onSelect={() => setConfirmClear(true)} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="h-3.5 w-3.5" />Clear all notifications</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {error && <DataRefreshNotice message="Couldn't update notifications. Showing the last loaded notifications, which may be outdated." onRetry={() => void fetchNotifications({ category: activeTab })} retrying={isRefreshing} />}
        {/* ── Notification List ── */}
        {isLoading && notifications.length === 0 ? (
          <NotificationsListSkeleton />
        ) : paginated.length > 0 ? (
          <div className={notificationStyles.list}>
            {paginated.map((n) => {
              const { Icon, style: iconStyle } = getCollectorNotificationVisual(n);
              const { headline, message } = getCollectorNotificationPresentation(n);
              const isUnread = !n.is_read;
              return (
                <button
                  type="button"
                  key={n.id}
                  disabled={isMutating}
                  onClick={() => handleClick(n)}
                  className={`${notificationStyles.row} ${
                    isUnread ? "border-l-primary bg-primary/[0.04]" : "border-l-transparent"
                  }`}
                >
                  <div className={`${notificationStyles.icon} ${iconStyle}`}>
                    <Icon aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    {isUnread && <span className="sr-only">Unread notification</span>}
                    <p className="text-sm font-semibold text-foreground/90 leading-snug break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors">
                      <span className="font-bold text-foreground">{headline.prefix}</span>
                      {headline.connector && <span className="text-foreground/80"> {headline.connector} </span>}
                      {headline.highlight && <span className="font-bold text-foreground">{headline.highlight}</span>}
                    </p>
                    {message && <p className={notificationStyles.message}>{message}</p>}
                    <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-muted-foreground/80 pt-1">
                      <Clock aria-hidden="true" className="size-3 shrink-0 text-muted-foreground/70" />
                      <span>{formatRelativeTime(n.created_at, { dateOptions: { month: "short", day: "numeric", year: "numeric" } })}</span>
                    </div>
                  </div>

                  <div className={notificationStyles.trailing}><ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" /></div>
                </button>
              );
            })}
          </div>
        ) : !error && !isLoading ? (
          <ListEmptyState icon={Bell} title="No notifications found"
            description="You're all caught up! New alerts will appear here in real-time." />
        ) : null}

        {/* ── Pagination ── */}
        <PaginationControls mobileLayout="summary" currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} variant="inline" />

        {nextCursor && <Button className="h-auto min-h-11 max-w-full whitespace-normal sm:min-h-9" variant="outline" disabled={isRefreshing || isMutating} loading={isLoading} loadingLabel="Loading older notifications…" onClick={() => void loadMore()}>{`Load older notifications (${notifications.length} of ${total} loaded)`}</Button>}
      </div>
      <ConfirmationDialog open={confirmClear} onOpenChange={setConfirmClear}
        title="Clear all notification history?"
        description="This permanently deletes notifications in every category, including older notifications. This cannot be undone."
        icon={<Trash2 />} variant="destructive" confirmLabel="Clear all" confirmDisabled={isMutating} pendingLabel="Clearing…"
        closeOnConfirm onConfirm={async () => { await clearAll(); setCurrentPage(1); }} />
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
