import { navigationStyles } from "../navigationStyles";
import { useState } from "react";
import { useThemeMode } from "@/hooks/useThemeMode";
import { toggleThemeMode } from "@/lib/theme";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  CheckCheck,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useNotifications from "@/hooks/useNotifications";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime } from "@/utils/date";
import {
  openCollectorNotification,
  getCollectorNotificationTitle,
  getCollectorNotificationVisual,
} from "@/features/collector/notifications/notificationRouting";

const COLLECTOR_PAGE_TITLES: Record<string, string> = {
  "/collector": "Driver Dashboard",
  "/collector/route-map": "Live Route Map",
  "/collector/route-history": "Route History",
  "/collector/notifications": "Notifications",
  "/collector/profile": "Driver Profile",
};

const getCollectorPageTitle = (pathname: string) => {
  if (COLLECTOR_PAGE_TITLES[pathname]) return COLLECTOR_PAGE_TITLES[pathname];
  return "Driver Portal";
};

import CollectorNotificationModal from "@/features/collector/notifications/CollectorNotificationModal";

const CollectorTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const dark = useThemeMode() === "dark";
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [bellOpen, setBellOpen] = useState(false);

  const { recentNotifications, unreadCount, markAsRead, markAllAsRead, isMarkingAll, isMutating, isRefreshing, error, fetchNotifications } = useNotifications();
  const pageTitle = getCollectorPageTitle(location.pathname);

  const [searchParams] = useSearchParams();
  const routeParam = searchParams.get("route");
  const isNestedRoute = location.pathname.startsWith("/collector/route-history") && Boolean(routeParam);
  const isRouteMap = location.pathname === "/collector/route-map";
  const isNotificationRouteMap = isRouteMap &&
    (searchParams.has("date") || searchParams.has("template") || searchParams.has("run"));

  const handleNotificationClick = (n: NotificationRow) => {
    if (!n.is_read) {
      void markAsRead(n.id);
    }
    setBellOpen(false);

    if (openCollectorNotification(n, navigate)) return;

    setSelectedNotification(n);
  };

  return (
    <>
    <header className={navigationStyles.topbar}>
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className={`${navigationStyles.menu} ${navigationStyles.mobileMenu}`}
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <nav aria-label="Breadcrumb" className={navigationStyles.breadcrumb}>
          {isRouteMap ? (
            <>
              <button
                type="button"
                onClick={() => navigate(isNotificationRouteMap ? "/collector/notifications" : "/collector")}
                className="rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={isNotificationRouteMap ? "Back to Notifications" : "Back to Driver Dashboard"}
              >
                {isNotificationRouteMap ? "Notifications" : "Driver Dashboard"}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" aria-hidden="true" />
              <span aria-current="page" className={navigationStyles.currentPage}>
                {pageTitle}
              </span>
            </>
          ) : isNestedRoute ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/collector/route-history")}
                className="rounded-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Route History
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className={navigationStyles.currentPage}>
                Route Detail
              </span>
            </>
          ) : (
            <span className={navigationStyles.currentPage}>
              {pageTitle}
            </span>
          )}
        </nav>
      </div>

      {/* Right */}
      <div className={navigationStyles.topbarActions}>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleThemeMode}
          className={`${navigationStyles.topbarButton} overflow-hidden`}
          title="Toggle Theme"
        >
          <Sun className={`gw-theme-icon w-4 h-4 absolute ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`gw-theme-icon w-4 h-4 absolute ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        </button>

        {/* Notifications */}
        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={navigationStyles.topbarButton}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={`${navigationStyles.unreadBadge} ${unreadCount > 9 ? "min-w-4 px-1" : "w-4"}`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="gw-topbar-notification-panel"
          >
            {/* Popover Header */}
            <div className="gw-topbar-notification-header">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground tracking-tight">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="gw-topbar-notification-count-label gw-topbar-notification-count-label--new">
                    {unreadCount} new
                  </span>
                ) : recentNotifications.length > 0 ? (
                  <span className="gw-topbar-notification-count-label">
                    {recentNotifications.length} recent
                  </span>
                ) : null}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={isMutating} onClick={() => void markAllAsRead()}
                  aria-busy={isMarkingAll}
                  className="gw-topbar-notification-action"
                >
                  {isMarkingAll ? <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                  <span>{isMarkingAll ? "Marking all read…" : "Mark all read"}</span>
                </button>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <div className="gw-topbar-notification-scroll scrollbar-thin">
              <div>
                {error && (
                  <DataRefreshNotice
                    primary
                    role={recentNotifications.length === 0 ? "alert" : "status"}
                    message={recentNotifications.length === 0
                      ? "Couldn't load notifications. Please try again."
                      : "Couldn't refresh notifications. Showing the last loaded notifications, which may be outdated."}
                    onRetry={() => void fetchNotifications()}
                    retrying={isRefreshing}
                    className="m-3 sm:flex-col sm:items-start"
                  />
                )}
                {recentNotifications.length === 0 ? (!error && (
                  <div className="gw-topbar-notification-empty">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto mb-3 text-primary">
                      <Bell className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No notifications</p>
                    <p className="text-ui-caption text-muted-foreground mt-0.5">You're all caught up!</p>
                  </div>
                )) : (
                  recentNotifications.map((n) => {
                    const { Icon, style: avatarStyle } = getCollectorNotificationVisual(n);
                    const title = getCollectorNotificationTitle(n);
                    const isUnread = !n.is_read;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        disabled={isMutating} onClick={() => handleNotificationClick(n)}
                        className={`gw-topbar-notification-row group ${isUnread ? "gw-topbar-notification-row--unread" : ""}`}
                      >
                        {/* Avatar Icon */}
                        <div className={`gw-topbar-notification-icon mt-0.5 border ${avatarStyle}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug break-words">
                              {title}
                            </p>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" title="Unread" />
                            )}
                          </div>

                          {n.body && (
                            <p className="text-ui-caption text-muted-foreground line-clamp-2 leading-relaxed break-words">
                              {n.body}
                            </p>
                          )}

                          <p className="text-[11px] text-muted-foreground font-medium pt-0.5">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Popover Footer */}
            <div className="gw-topbar-notification-footer">
              <button
                type="button"
                onClick={() => {
                  setBellOpen(false);
                  navigate("/collector/notifications");
                }}
                className="gw-topbar-notification-action w-full py-2 group"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
    <CollectorNotificationModal notification={selectedNotification} open={Boolean(selectedNotification)} onOpenChange={(open) => { if (!open) setSelectedNotification(null); }} />
    </>
  );
};

export default CollectorTopBar;
