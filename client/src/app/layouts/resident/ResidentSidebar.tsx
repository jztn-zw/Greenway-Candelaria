import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Truck,
  AlertTriangle,
  ClipboardList,
  Bell,
  LogOut,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/common/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";
import useNotifications from "@/hooks/useNotifications";
import postsService from "@/services/postsService";

const ResidentSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const fullName = currentUser?.full_name?.trim() || "Unknown User";
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "RS";

  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const [showGearMenu, setShowGearMenu] = useState(false);
  const [settingsRotation, setSettingsRotation] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [hasNewPost, setHasNewPost] = useState(false);

  const lastSeenKey = currentUser?.id
    ? `greenway_last_seen_post_${currentUser.id}`
    : "greenway_last_seen_post";
  const lastSeenTimeKey = currentUser?.id
    ? `greenway_last_seen_post_time_${currentUser.id}`
    : "greenway_last_seen_post_time";

  // Check for new posts & handle clearing when resident views Contents
  useEffect(() => {
    let isMounted = true;

    const checkNewPosts = async () => {
      // If resident is currently on Contents, clear badge and mark seen
      if (location.pathname.startsWith("/resident/contents")) {
        if (isMounted) setHasNewPost(false);

        // Mark any unread post notifications as read
        const unreadPostNotifs = notifications.filter(
          (n) => !n.is_read && (n.type === "NEW_POST" || n.ref_module === "posts")
        );
        if (unreadPostNotifs.length > 0) {
          unreadPostNotifs.forEach((n) => void markAsRead(n.id));
        }

        try {
          const list = await postsService.getAll({ status: "PUBLISHED" });
          const posts = Array.isArray(list) ? list : list?.posts || [];
          if (posts.length > 0) {
            const latest = posts[0];
            localStorage.setItem(lastSeenKey, String(latest.id));
            localStorage.setItem(lastSeenTimeKey, new Date().toISOString());
          }
        } catch {
          // ignore network errors silently
        }
        return;
      }

      // 1. Check if there is an unread NEW_POST notification in the notifications store
      const hasUnreadPostNotif = notifications.some(
        (n) => !n.is_read && (n.type === "NEW_POST" || n.ref_module === "posts")
      );
      if (hasUnreadPostNotif) {
        if (isMounted) setHasNewPost(true);
        return;
      }

      // 2. Fetch latest published post to check if there is a new post since last visit
      try {
        const list = await postsService.getAll({ status: "PUBLISHED" });
        const posts = Array.isArray(list) ? list : list?.posts || [];
        if (!isMounted) return;

        if (posts.length === 0) {
          setHasNewPost(false);
          return;
        }

        const latest = posts[0];
        const lastSeenId = localStorage.getItem(lastSeenKey);
        const lastSeenTime = localStorage.getItem(lastSeenTimeKey);

        if (!lastSeenId && !lastSeenTime) {
          // First time opening app: treat existing posts as seen to prevent stale indicator
          localStorage.setItem(lastSeenKey, String(latest.id));
          localStorage.setItem(lastSeenTimeKey, new Date().toISOString());
          setHasNewPost(false);
          return;
        }

        if (lastSeenId && String(latest.id) !== lastSeenId) {
          if (lastSeenTime && latest.created_at) {
            const isNewer =
              new Date(latest.created_at).getTime() >
              new Date(lastSeenTime).getTime();
            setHasNewPost(isNewer);
          } else {
            setHasNewPost(true);
          }
        } else {
          setHasNewPost(false);
        }
      } catch {
        if (isMounted) setHasNewPost(false);
      }
    };

    void checkNewPosts();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, notifications, currentUser?.id]);

  const hasUnreadNotifications = unreadCount > 0;

  const navGroups = useMemo(
    () => [
      {
        label: "OVERVIEW",
        items: [{ title: "Dashboard", url: "/resident", icon: LayoutDashboard }],
      },
      {
        label: "INFORMATION",
        items: [
          {
            title: "Contents",
            url: "/resident/contents",
            icon: FileText,
            showDot: hasNewPost,
          },
          { title: "Truck Tracking", url: "/resident/tracking", icon: Truck },
        ],
      },
      {
        label: "REPORT WASTE ISSUES",
        items: [
          { title: "Submit Report", url: "/resident/report", icon: AlertTriangle },
          { title: "My Reports", url: "/resident/my-reports", icon: ClipboardList },
        ],
      },
      {
        label: "NOTIFICATION",
        items: [
          {
            title: "Notifications",
            url: "/resident/notifications",
            icon: Bell,
            showDot: hasUnreadNotifications,
          },
        ],
      },
    ],
    [hasNewPost, hasUnreadNotifications]
  );

  const isActive = (path: string) =>
    path === "/resident"
      ? location.pathname === "/resident"
      : location.pathname.startsWith(path);

  const handleSettingsClick = () => {
    setSettingsRotation((prev) => prev + 180);
    setShowGearMenu(!showGearMenu);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      {/* ── Logo Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b border-border shrink-0
          group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
          <img src="/greenway.svg" alt="GreenWay Logo" className="w-9 h-9" />
        </div>

        <div
          className="min-w-0 overflow-hidden transition-all duration-200
            group-data-[collapsible=icon]:hidden"
        >
          <p className="font-display text-base font-bold text-foreground truncate leading-none">
            GreenWay
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            Resident Portal
          </p>
        </div>
      </div>

      {/* ── Nav Groups ── */}
      <SidebarContent className="py-4 px-3 flex flex-col gap-5 group-data-[collapsible=icon]:px-0 overflow-y-auto">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="text-[10px] tracking-[0.12em] text-primary/60 font-semibold uppercase mb-1 px-2 h-auto group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={`
                          ${active ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary" : "text-foreground hover:bg-muted/50"}
                          group-data-[collapsible=icon]:!w-11 group-data-[collapsible=icon]:!h-11 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto
                        `}
                      >
                        <NavLink
                          to={item.url}
                          end={item.url === "/resident"}
                          className="relative flex w-full h-full items-center px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                          activeClassName=""
                        >
                          {active && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2
                                w-0.5 h-5 rounded-full bg-primary
                                group-data-[collapsible=icon]:hidden"
                            />
                          )}

                          <div className="relative flex items-center justify-center shrink-0">
                            <item.icon
                              className={`h-[18px] w-[18px] shrink-0 ${
                                active ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                            {item.showDot && (
                              <span
                                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive
                                  hidden group-data-[collapsible=icon]:block"
                              />
                            )}
                          </div>

                          <span className="truncate flex-1 ml-3 group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>

                          {item.showDot && (
                            <span
                              className="ml-auto w-2 h-2 rounded-full bg-destructive shrink-0
                                group-data-[collapsible=icon]:hidden"
                            />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="p-3">
        <div
          className="rounded-2xl border border-border/80 bg-card/60 p-2.5 shadow-sm
            group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent"
        >
          {/* Top user profile row */}
          <div className="flex items-center gap-2.5 relative">
            <Avatar className="w-9 h-9 shrink-0 ring-1 ring-border/50">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div
              className="flex flex-1 items-center justify-between min-w-0 overflow-hidden
                transition-all duration-200 group-data-[collapsible=icon]:hidden"
            >
              <div className="min-w-0 flex-1 pr-1">
                <p className="text-sm font-bold text-foreground truncate leading-snug">
                  {fullName}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-none mt-0.5">
                  Resident · MENRO Candelaria
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettingsClick}
                className="p-1 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Settings"
              >
                <Settings
                  className="w-4 h-4 transition-transform duration-500 ease-in-out"
                  style={{ transform: `rotate(${settingsRotation}deg)` }}
                />
              </button>
            </div>

            {/* Gear dropdown popup */}
            {showGearMenu && !collapsed && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <a
                  href="/resident/profile"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors rounded-md mx-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" /> Profile
                </a>
                <a
                  href="/resident/settings"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors rounded-md mx-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                </a>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-border/60 group-data-[collapsible=icon]:hidden" />

          {/* Logout button row */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm
              text-destructive hover:bg-destructive/10
              transition-colors duration-200 font-semibold border-none bg-transparent
              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mt-1.5"
          >
            <LogOut className="w-4 h-4 shrink-0 text-destructive" />
            <span className="group-data-[collapsible=icon]:hidden text-xs font-bold text-destructive">
              Log Out
            </span>
          </button>
        </div>

        <LogoutConfirmModal
          open={showLogoutModal}
          onOpenChange={setShowLogoutModal}
          onConfirm={() => {
            void handleLogout();
          }}
        />
      </SidebarFooter>

      {/* ── Collapse Toggle (half outside sidebar) ── */}
      <button
        onClick={toggleSidebar}
        className="absolute z-50 top-[76px] -translate-y-1/2 -right-3
          w-6 h-6 rounded-full
          bg-sidebar border border-border shadow-sm
          flex items-center justify-center
          hover:bg-muted transition-colors duration-200"
        aria-label="Toggle Sidebar"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </Sidebar>
  );
};

export default ResidentSidebar;
