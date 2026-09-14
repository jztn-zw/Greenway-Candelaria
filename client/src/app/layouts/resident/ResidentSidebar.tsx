import { useState, useEffect, useMemo, useRef } from "react";
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
import { cn } from "@/lib/utils";

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
  const gearMenuRef = useRef<HTMLDivElement>(null);
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
        label: "COMMUNITY INFORMATION",
        items: [
          {
            title: "Community Updates",
            url: "/resident/contents",
            icon: FileText,
            showDot: hasNewPost,
          },
          { title: "Collection Tracking", url: "/resident/tracking", icon: Truck },
        ],
      },
      {
        label: "WASTE REPORTS",
        items: [
          { title: "Report an Issue", url: "/resident/report", icon: AlertTriangle },
          { title: "My Reports", url: "/resident/my-reports", icon: ClipboardList },
        ],
      },
      {
        label: "NOTIFICATIONS",
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

  useEffect(() => {
    if (!showGearMenu) return;

    const closeMenu = (event: PointerEvent) => {
      if (!gearMenuRef.current?.contains(event.target as Node)) {
        setShowGearMenu(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowGearMenu(false);
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showGearMenu]);

  useEffect(() => {
    if (collapsed) setShowGearMenu(false);
  }, [collapsed]);

  const handleSettingsClick = () => setShowGearMenu((isOpen) => !isOpen);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      {/* ── Logo Header ── */}
      <button
        type="button"
        onClick={() => navigate("/resident")}
        title="Go to Resident Dashboard"
        className="h-14 px-4 flex items-center gap-3 border-b border-border/70 shrink-0 bg-sidebar/50 text-left cursor-pointer
          group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20 shadow-2xs">
          <img src="/greenway.svg" alt="GreenWay Logo" className="w-5 h-5 object-contain" />
        </div>

        <div
          className="min-w-0 overflow-hidden transition-all duration-200
            group-data-[collapsible=icon]:hidden"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[15px] font-extrabold text-foreground tracking-tight leading-none">
              GreenWay
            </span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate mt-1 leading-none">
            MENRO Candelaria
          </p>
        </div>
      </button>

      {/* ── Nav Groups ── */}
      <SidebarContent className="py-3 px-2.5 flex flex-col gap-2.5 group-data-[collapsible=icon]:px-1.5 overflow-y-auto">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="text-[10px] tracking-[0.08em] text-muted-foreground/60 font-bold uppercase mb-1 px-2.5 h-auto py-0.5 group-data-[collapsible=icon]:hidden select-none">
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
                        className={cn(
                          "relative h-9 px-2.5 rounded-xl font-medium text-xs sm:text-[13px] transition-all duration-150 select-none group",
                          active
                            ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20 hover:bg-primary/15 hover:text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.99]",
                          "group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-xl"
                        )}
                      >
                        <NavLink
                          to={item.url}
                          end={item.url === "/resident"}
                          className="flex w-full h-full items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                          activeClassName=""
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <item.icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              )}
                            />
                            {item.showDot && (
                              <span
                                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive
                                  hidden group-data-[collapsible=icon]:block"
                              />
                            )}
                          </div>

                          <span className="truncate flex-1 tracking-tight group-data-[collapsible=icon]:hidden">
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
      <SidebarFooter className="p-2.5 border-t border-border/60 bg-sidebar/30">
        <div
          className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-2.5 shadow-2xs
            group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent"
        >
          {/* Top user profile row */}
          <div ref={gearMenuRef} className="flex items-center gap-2.5 relative">
            <div className="relative shrink-0">
              <Avatar className="w-9 h-9 rounded-xl border border-border/80 shadow-2xs">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-extrabold rounded-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div
              className="flex flex-1 items-center justify-between min-w-0 overflow-hidden
                transition-all duration-200 group-data-[collapsible=icon]:hidden"
            >
              <div className="min-w-0 flex-1 pr-1">
                <p className="text-xs font-bold font-display text-foreground truncate leading-tight">
                  {fullName}
                </p>
                <p className="text-[10.5px] text-muted-foreground truncate leading-none mt-1">
                  Resident
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettingsClick}
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Settings"
              >
                <Settings
                  className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                    showGearMenu ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            </div>

            {/* Gear dropdown popup */}
            {showGearMenu && !collapsed && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGearMenu(false);
                    navigate("/resident/profile");
                  }}
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" /> Profile
                </button>
                <button
                  type="button"
                  className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGearMenu(false);
                    navigate("/resident/settings");
                  }}
                >
                  <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-border/60 group-data-[collapsible=icon]:hidden" />

          {/* Logout button row */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 w-full h-8 px-2.5 rounded-xl text-xs
              text-destructive hover:bg-destructive/10
              transition-colors duration-150 font-bold border-none bg-transparent cursor-pointer
              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mt-1.5"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-destructive" />
            <span className="group-data-[collapsible=icon]:hidden text-xs font-bold text-destructive truncate">
              Sign Out
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

      {/* ── Collapse Toggle ── */}
      <button
        onClick={toggleSidebar}
        className="absolute z-50 top-[56px] -translate-y-1/2 -right-3
          w-6 h-6 rounded-full shrink-0
          bg-card border border-border/80 shadow-xs
          flex items-center justify-center text-muted-foreground hover:text-foreground
          hover:bg-muted hover:scale-105 active:scale-95 transition-all cursor-pointer"
        aria-label="Toggle Sidebar"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </Sidebar>
  );
};

export default ResidentSidebar;
