import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Menu,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  FileText,
  AlertTriangle,
  Megaphone,
  Truck,
  Newspaper,
  CheckCheck,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime } from "@/utils/date";

const getAdminNotificationStyle = (type: string) => {
  switch (type) {
    case "REPORT_UPDATE":
    case "REPORT_FILED":
      return { Icon: FileText, style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    case "MISSED_COLLECTION":
      return { Icon: AlertTriangle, style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    case "TRUCK_IS_NEAR":
      return { Icon: Truck, style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
    case "ANNOUNCEMENT":
      return { Icon: Megaphone, style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    case "NEW_POST":
      return { Icon: Newspaper, style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    default:
      return { Icon: Bell, style: "bg-primary/10 text-primary border-primary/20" };
  }
};

const getReadableNotificationTitle = (notification: NotificationRow) => {
  const title = (notification.title || "Notification").trim();
  // Older notifications can contain the same title twice, separated by a colon.
  const repeatedTitle = title.match(/^(.+?):\s*\1$/i);
  return repeatedTitle ? repeatedTitle[1] : title.replace(/[🚨⚠️]/g, "").trim();
};

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/admin/reports": "Waste Reports",
  "/admin/posts": "News & Articles",
  "/admin/announcements": "Announcements",
  "/admin/schedule": "Collection Schedule",
  "/admin/routes": "Route Management",
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

  const postParam = searchParams.get("post");
  const postTitle = searchParams.get("title");
  const editParam = searchParams.get("edit");
  const isCreateAction = searchParams.get("action") === "create";
  const isPreview = searchParams.get("preview") === "true";

  const isPostSubView =
    location.pathname.startsWith("/admin/posts") &&
    (Boolean(postParam) || Boolean(editParam) || isCreateAction || isPreview);

  const subViewTitle = isCreateAction
    ? "Create Article"
    : editParam
      ? postTitle ? `Edit: ${postTitle}` : "Edit Article"
      : postTitle || "Article Details";

  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [bellOpen, setBellOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  };

  const handleNotificationClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }
    setBellOpen(false);

    if ((n.ref_module === "reports" || n.type === "REPORT_UPDATE") && n.ref_id) {
      navigate(`/admin/reports?report=${encodeURIComponent(n.ref_id)}`);
    } else if ((n.ref_module === "posts" || n.type === "NEW_POST") && n.ref_id) {
      navigate(`/admin/posts?post=${encodeURIComponent(n.ref_id)}`);
    } else if (n.ref_module === "posts" || n.type === "NEW_POST") {
      navigate("/admin/posts");
    } else if (n.ref_module === "announcements") {
      navigate("/admin/announcements");
    } else if (n.ref_module === "tracking") {
      navigate("/admin/tracking");
    } else {
      navigate("/admin/notifications");
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between px-3.5 sm:px-5 shrink-0 sticky top-0 z-20 transition-colors">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer shrink-0 active:scale-95"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          {isPostSubView ? (
            <>
              <button
                type="button"
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
                className="hover:underline text-muted-foreground font-medium truncate shrink-0 cursor-pointer"
              >
                News & Articles
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
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
                    className="hover:underline text-muted-foreground font-medium truncate shrink-0 cursor-pointer max-w-[120px] sm:max-w-[180px]"
                  >
                    {subViewTitle}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="font-bold text-foreground truncate tracking-tight">
                    Preview
                  </span>
                </>
              ) : (
                <span className="font-bold text-foreground truncate tracking-tight max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                  {subViewTitle}
                </span>
              )}
            </>
          ) : (
            <span className="font-bold text-foreground truncate tracking-tight">
              {pageTitle}
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 relative flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 border border-transparent hover:border-border/60"
          title="Toggle Theme"
        >
          <Sun className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        </button>

        {/* Notifications */}
        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-8 h-8 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 relative flex items-center justify-center cursor-pointer active:scale-95 border border-transparent hover:border-border/60"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background leading-none ${unreadCount > 9 ? "min-w-4 px-1" : "w-4"}`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[360px] sm:w-[410px] p-0 shadow-2xl rounded-2xl border border-border/80 bg-card overflow-hidden"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-muted/25">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm font-display text-foreground tracking-tight">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded-full px-2 py-0.5 leading-none">
                    {unreadCount} new
                  </span>
                ) : recentNotifications.length > 0 ? (
                  <span className="bg-muted text-muted-foreground border border-border/60 text-[10px] font-medium rounded-full px-2 py-0.5 leading-none">
                    {recentNotifications.length} recent
                  </span>
                ) : null}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <ScrollArea className="max-h-[380px]">
              <div className="p-2 space-y-1">
                {recentNotifications.length > 0 ? (
                  recentNotifications.map((n) => {
                    const { Icon, style: avatarStyle } = getAdminNotificationStyle(n.type);
                    const isUnread = !n.is_read;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full p-2.5 sm:p-3 rounded-xl text-left flex items-start gap-3 transition-all duration-150 cursor-pointer group relative border ${
                          isUnread
                            ? "bg-primary/[0.04] border-primary/15 hover:bg-primary/[0.08]"
                            : "bg-transparent border-transparent hover:bg-muted/60"
                        }`}
                      >
                        {/* Avatar Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${avatarStyle}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-snug break-words">
                              {getReadableNotificationTitle(n)}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 shrink-0 mt-1" title="Unread" />
                            )}
                          </div>

                          {n.body && (
                            <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed break-words">
                              {n.body}
                            </p>
                          )}

                          <p className="text-[10px] text-muted-foreground/70 font-medium pt-0.5">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-10 px-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto mb-2.5 text-muted-foreground/60">
                      <Bell className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No notifications</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">You're all caught up!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Popover Footer */}
            <div className="border-t border-border/70 p-2 bg-muted/20">
              <button
                type="button"
                onClick={() => {
                  setBellOpen(false);
                  navigate("/admin/notifications");
                }}
                className="w-full py-2 px-3 rounded-xl text-center text-xs font-semibold text-foreground hover:text-primary hover:bg-muted/70 transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default AdminTopBar;
