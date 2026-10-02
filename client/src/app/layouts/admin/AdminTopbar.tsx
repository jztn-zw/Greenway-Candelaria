import { useState } from "react";
import { useThemeMode } from "@/hooks/useThemeMode";
import { toggleThemeMode } from "@/lib/theme";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Menu,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AdminNotificationModal, { type AdminNotificationDetail } from "@/features/admin/notifications/AdminNotificationModal";
import { getAdminNotificationDestination, getNotificationHeadline, getNotificationIconAndStyle } from "@/features/admin/notifications/notificationPresentation";
import useNotifications from "@/features/admin/notifications/useAdminNotifications";
import { NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime, parseApiTimestamp } from "@/utils/date";

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/admin/reports": "Waste Reports",
  "/admin/posts": "Community Posts",
  "/admin/announcements": "Announcements",
  "/admin/schedule": "Collection Schedule",
  "/admin/routes": "Route Management",
  "/admin/barangays": "Barangay Manager",
  "/admin/residents": "Resident Accounts",
  "/admin/drivers": "Collector Manager",
  "/admin/tracking": "Live Truck Fleet",
  "/admin/analytics": "Analytics & Reports",
  "/admin/audit-logs": "Audit Logs",
  "/admin/notifications": "Notifications",
  "/admin/settings": "System Settings",
  "/admin/profile": "Admin Profile",
};

const getAdminPageTitle = (pathname: string) => {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];
  for (const [route, title] of Object.entries(ADMIN_PAGE_TITLES)) {
    if (route !== "/admin" && pathname.startsWith(route)) {
      return title;
    }
  }
  return "Admin Panel";
};

const AdminTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toggleSidebar } = useSidebar();
  const pageTitle = getAdminPageTitle(location.pathname);
  const isCollectorProfile =
    location.pathname.startsWith("/admin/drivers") && Boolean(searchParams.get("collectorId"));
  const collectorName = searchParams.get("collectorName") || "Collector Profile";
  const isTruckProfile =
    location.pathname.startsWith("/admin/drivers") && Boolean(searchParams.get("truckId"));
  const truckName = searchParams.get("truckName") || "Truck Details";
  const isResidentProfile =
    location.pathname.startsWith("/admin/residents") && Boolean(searchParams.get("residentId"));
  const residentName = searchParams.get("residentName") || "Resident Profile";

  const postParam = searchParams.get("post");
  const postTitle = searchParams.get("title");
  const editParam = searchParams.get("edit");
  const isCreateAction = searchParams.get("action") === "create";
  const isPreview = searchParams.get("preview") === "true";

  const isPostSubView =
    location.pathname.startsWith("/admin/posts") &&
    (Boolean(postParam) || Boolean(editParam) || isCreateAction || isPreview);

  const subViewTitle = isCreateAction
    ? "Create Post"
    : editParam
      ? postTitle ? `Edit: ${postTitle}` : "Edit Post"
      : postTitle || "Post Details";

  const dark = useThemeMode() === "dark";
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [visibleNotificationCount, setVisibleNotificationCount] = useState(6);
  const [modalNotification, setModalNotification] = useState<AdminNotificationDetail | null>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingAll, isMutating } = useNotifications();

  const handleNotificationClick = async (n: NotificationRow) => {
    if (!n.is_read) await markAsRead(n.id);
    setPopoverOpen(false);
    const destination = getAdminNotificationDestination(n);
    if (destination) navigate(destination);
    else setModalNotification({ id: n.id, title: getNotificationHeadline(n).prefix,
      message: n.body, type: n.type, time: formatRelativeTime(n.created_at),
      ref_module: n.ref_module, metadata: n.metadata });
  };

  const visibleNotifications = notifications.slice(0, visibleNotificationCount);
  const hasMoreNotifications = visibleNotificationCount < notifications.length;
  const recentNotificationCount = notifications.filter((notification) => {
    const timestamp = parseApiTimestamp(notification.created_at)?.getTime();
    if (timestamp === undefined) return false;
    const elapsed = Date.now() - timestamp;
    return elapsed >= 0 && elapsed < 86_400_000;
  }).length;
  const loadMoreNotifications = () => {
    if (hasMoreNotifications) setVisibleNotificationCount((count) => Math.min(count + 6, notifications.length));
  };
  return (
    <header className="h-14 border-b border-border/80 bg-background flex items-center justify-between px-3.5 sm:px-5 shrink-0 sticky top-0 z-20 transition-colors">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="gw-action-ghost md:hidden w-8 h-8 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          {isCollectorProfile ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("collectorId");
                    next.delete("collectorName");
                    return next;
                  });
                }}
                className="hover:text-foreground transition-colors text-muted-foreground font-medium truncate shrink-0 cursor-pointer"
              >
                Collector Manager
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-bold text-foreground truncate tracking-tight max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                {collectorName}
              </span>
            </>
          ) : isTruckProfile ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("truckId");
                    next.delete("truckName");
                    return next;
                  });
                }}
                className="hover:text-foreground transition-colors text-muted-foreground font-medium truncate shrink-0 cursor-pointer"
              >
                Collector Manager
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-bold text-foreground truncate tracking-tight max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                {truckName}
              </span>
            </>
          ) : isResidentProfile ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("residentId");
                    next.delete("residentName");
                    return next;
                  });
                }}
                className="hover:text-foreground transition-colors text-muted-foreground font-medium truncate shrink-0 cursor-pointer"
              >
                Resident Accounts
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-bold text-foreground truncate tracking-tight max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                {residentName}
              </span>
            </>
          ) : isPostSubView ? (
            <>
              <button
                type="button"
                aria-label="Back to Community Posts"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("post");
                    next.delete("title");
                    next.delete("edit");
                    next.delete("action");
                    next.delete("preview");
                    return next;
                  });
                }}
                className="hover:text-foreground transition-colors text-muted-foreground font-medium truncate shrink-0 cursor-pointer"
              >
                Community Posts
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" aria-hidden="true" />
              {isPreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete("preview");
                        return next;
                      });
                    }}
                    className="hover:text-foreground transition-colors text-muted-foreground font-medium truncate shrink-0 cursor-pointer max-w-[120px] sm:max-w-[180px]"
                  >
                    {subViewTitle}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span aria-current="page" className="font-bold text-foreground truncate tracking-tight">
                    Preview
                  </span>
                </>
              ) : (
                <span aria-current="page" className="font-bold text-foreground truncate tracking-tight max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                  {subViewTitle}
                </span>
              )}
            </>
          ) : (
            <span className="font-bold text-foreground truncate tracking-tight">
              {pageTitle}
            </span>
          )}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleThemeMode}
          className="gw-action-ghost w-8 h-8 rounded-lg transition-all duration-200 relative flex items-center justify-center overflow-hidden cursor-pointer border"
          title="Toggle Theme"
        >
          <Sun className={`gw-theme-icon w-4 h-4 absolute ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`gw-theme-icon w-4 h-4 absolute ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        </button>

        {/* Notifications Popover */}
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open);
            if (open) {
              setVisibleNotificationCount(6);

            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="gw-action-ghost w-8 h-8 rounded-lg transition-all duration-200 relative flex items-center justify-center cursor-pointer border"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 h-4 bg-destructive text-destructive-foreground text-ui-overline font-bold rounded-full flex items-center justify-center ring-2 ring-background leading-none ${unreadCount > 9 ? "min-w-4 px-1" : "w-4"}`}>
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
                {notifications.length > 0 && (
                  <span className="gw-topbar-notification-count-label">
                    {recentNotificationCount} recent
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={isMutating}
                  aria-busy={isMarkingAll}
                  className="gw-topbar-notification-action"
                >
                  {isMarkingAll ? <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                  <span>{isMarkingAll ? "Marking all read…" : "Mark all read"}</span>
                </button>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <div
              className="gw-topbar-notification-scroll scrollbar-thin"
              onScroll={(event) => {
                const viewport = event.currentTarget;
                const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
                if (remaining < 32) loadMoreNotifications();
              }}
            >
              <div>
                {visibleNotifications.length > 0 ? (
                  visibleNotifications.map((n) => {
                    const headline = getNotificationHeadline(n);
                    const { Icon, style: avatarStyle } = getNotificationIconAndStyle(n);
                    const isUnread = !n.is_read;

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => void handleNotificationClick(n)}
                        className={`gw-topbar-notification-row group ${isUnread ? "gw-topbar-notification-row--unread" : ""}`}
                      >
                        {/* Avatar Icon */}
                        <div className={`gw-topbar-notification-icon mt-0.5 border ${avatarStyle}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] leading-snug break-words">
                              <span className="font-semibold text-foreground">
                                {headline.prefix}
                              </span>
                              {headline.connector && (
                                <span className="text-muted-foreground font-normal"> {headline.connector} </span>
                              )}
                              {headline.highlight && (
                                <span className="font-semibold text-foreground">
                                  {headline.highlight}
                                </span>
                              )}
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
                ) : (
                  <div className="gw-topbar-notification-empty">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto mb-3 text-primary">
                      <Bell className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No notifications</p>
                    <p className="text-ui-caption text-muted-foreground mt-0.5">You're all caught up!</p>
                  </div>
                )}
                {hasMoreNotifications && (
                  <div className="py-3 text-center text-ui-caption font-medium text-muted-foreground">
                    Scroll for older notifications
                  </div>
                )}
              </div>
            </div>

            {/* Popover Footer */}
            <div className="gw-topbar-notification-footer">
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  navigate("/admin/notifications");
                }}
                className="gw-topbar-notification-action w-full py-2 group"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <AdminNotificationModal notification={modalNotification} open={Boolean(modalNotification)} onOpenChange={(open) => { if (!open) setModalNotification(null); }} />
      </div>
    </header>
  );
};

export default AdminTopBar;
