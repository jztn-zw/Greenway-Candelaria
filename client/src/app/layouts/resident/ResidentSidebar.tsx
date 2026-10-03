import { navigationStyles, navigationSectionTitle } from "../navigationStyles";
import { useResidentQuery } from "@/lib/residentQuery";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { profileAvatarForCurrentUser, profileAvatarSrc } from "@/components/common/profileAvatars";
import useAuthStore from "@/store/authStore";
import useNotifications from "@/features/resident/notifications/useResidentNotifications";
import postsService from "@/services/postsService";
import { cn } from "@/lib/utils";
import { parseApiTimestamp } from "@/utils/date";

const ResidentSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);
  const fullName = currentUser?.full_name?.trim() || "Unknown User";
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "RS";

  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const [showGearMenu, setShowGearMenu] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [hasNewPost, setHasNewPost] = useState(false);
  const latestPosts = useResidentQuery("posts", ["latest-badge"],
    () => postsService.getPage<{ id: string; created_at?: string }>({ status: "PUBLISHED", page: 1, limit: 1 }));

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
          const posts = latestPosts.data?.posts ?? [];
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
        const posts = latestPosts.data?.posts ?? [];
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
            const latestTime = parseApiTimestamp(latest.created_at)?.getTime() ?? 0;
            const seenTime = parseApiTimestamp(lastSeenTime)?.getTime() ?? 0;
            const isNewer = latestTime > seenTime;
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
  }, [
    location.pathname,
    latestPosts.data,
    notifications,
    currentUser?.id,
    lastSeenKey,
    lastSeenTimeKey,
    markAsRead,
  ]);

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
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    navigate("/", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="gw-navigation-panel">
      {/* ── Logo Header ── */}
      <button
        type="button"
        onClick={() => {
          navigate("/resident");
          closeMobileSidebar();
        }}
        title="Go to Resident Dashboard"
        className={navigationStyles.brand}
      >
        <div className={navigationStyles.brandIcon}>
          <img src="/greenway.svg" alt="GreenWay Logo" className="w-5 h-5 object-contain" />
        </div>

        <div
          className={navigationStyles.brandText}
        >
          <div className="flex items-center gap-1.5">
            <span className={navigationStyles.brandName}>
              GreenWay
            </span>
          </div>
          <p className={navigationStyles.brandCaption}>
            MENRO Candelaria
          </p>
        </div>
      </button>

      {/* ── Nav Groups ── */}
      <SidebarContent className={navigationStyles.content}>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className={navigationStyles.sectionLabel}>
              {navigationSectionTitle(group.label)}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          navigationStyles.item,
                          active
                            ? navigationStyles.activeItem
                            : navigationStyles.inactiveItem
                        )}
                      >
                        <NavLink
                          aria-label={item.title}
                          to={item.url}
                          end={item.url === "/resident"}
                          onClick={closeMobileSidebar}
                          className={navigationStyles.link}
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

                          <span className={navigationStyles.itemLabel}>
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
      <SidebarFooter className={navigationStyles.footer}>
        <div
          className={navigationStyles.account}
        >
          {/* Top user profile row */}
          <div ref={gearMenuRef} className={navigationStyles.accountRow}>
            <div className="relative shrink-0">
              <Avatar className={navigationStyles.avatar}>
                <AvatarImage src={profileAvatarSrc(profileAvatarForCurrentUser(currentUser?.id, currentUser?.avatar_url, "RESIDENT"))} alt="" className="object-cover object-center" />
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold rounded-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div
              className={navigationStyles.accountDetails}
            >
              <div className="min-w-0 flex-1 pr-1">
                <p className={navigationStyles.accountName}>
                  {fullName}
                </p>
                <p className="text-ui-caption text-muted-foreground truncate leading-none mt-1">
                  Resident
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettingsClick}
                className={navigationStyles.settings}
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
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border/80 rounded-xl shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  className={navigationStyles.accountMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGearMenu(false);
                    navigate("/resident/profile");
                    closeMobileSidebar();
                  }}
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" /> Profile
                </button>
                <button
                  type="button"
                  className={navigationStyles.accountMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGearMenu(false);
                    navigate("/resident/settings");
                    closeMobileSidebar();
                  }}
                >
                  <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={navigationStyles.divider} />

          {/* Logout button row */}
          <button
            aria-label="Sign Out"
            onClick={() => setShowLogoutModal(true)}
            className={navigationStyles.signOut}
          >
            <LogOut className="size-4 shrink-0" />
            <span className={navigationStyles.signOutLabel}>
              Sign Out
            </span>
          </button>
        </div>

        <LogoutConfirmModal
          open={showLogoutModal}
          onOpenChange={setShowLogoutModal}
          onConfirm={handleLogout}
        />
      </SidebarFooter>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={toggleSidebar}
        className={navigationStyles.collapse}
        aria-label="Toggle Sidebar"
      >
        <ChevronLeft
          aria-hidden="true"
          className={cn("gw-navigation-collapse-icon size-3.5", collapsed && "rotate-180")}
        />
      </button>
    </Sidebar>
  );
};

export default ResidentSidebar;
