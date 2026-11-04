import GreenWayLogo from "@/components/common/GreenWayLogo";
import { navigationStyles, navigationSectionTitle } from "../navigationStyles";
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Route,
  Users,
  Truck,
  AlertTriangle,
  BarChart3,
  ClipboardList, LogOut,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronDown,
  Navigation,
  CalendarDays,
  Bell,
  MapPinned
} from "lucide-react";
import { NavLink } from "@/components/common/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
import { useEffect, useRef, useState, type ComponentType } from "react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { profileAvatarForCurrentUser, profileAvatarImageSrc } from "@/components/common/profileAvatars";
import useAuthStore from "@/store/authStore";
import useLogout from "@/hooks/useLogout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  hidden?: boolean;
}

interface NavGroup {
  label: string;
  collapsible: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "OVERVIEW",
    collapsible: false,
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "COMMUNITY CONTENT",
    collapsible: true,
    items: [
      { title: "Community Posts", url: "/admin/posts", icon: FileText },
      { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
      { title: "Event Management", url: "/admin/schedule", icon: CalendarDays },
    ],
  },
  {
    label: "COLLECTION OPERATIONS",
    collapsible: true,
    items: [
      { title: "Route Management", url: "/admin/routes", icon: Route },
      { title: "Barangay Management", url: "/admin/barangays", icon: MapPinned },
    ],
  },
  {
    label: "ACCOUNT MANAGEMENT",
    collapsible: true,
    items: [
      { title: "Resident Management", url: "/admin/residents", icon: Users },
      { title: "Collector Management", url: "/admin/drivers", icon: Truck },
    ],
  },
  {
    label: "OPERATIONS",
    collapsible: true,
    items: [
      { title: "Waste Reports Management", url: "/admin/reports", icon: AlertTriangle },
      { title: "Live Truck Tracking", url: "/admin/tracking", icon: Navigation },
    ],
  },
  {
    label: "ANALYTICS",
    collapsible: true,
    items: [
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList },
    ],
  },
  {
    label: "NOTIFICATIONS",
    collapsible: true,
    items: [{ title: "Notifications", url: "/admin/notifications", icon: Bell }],
  },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const fullName = currentUser?.full_name?.trim() || "Unknown User";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AD";
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [showGearMenu, setShowGearMenu] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogout = useLogout();

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  useEffect(() => {
    if (!showGearMenu) return;

    const closeMenu = (event: PointerEvent) => {
      if (!gearMenuRef.current?.contains(event.target as Node)) setShowGearMenu(false);
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

  const renderMenuItems = (items: NavItem[]) => (
    <SidebarMenu className="gap-1">
      {items.filter((item) => !item.hidden).map((item) => {
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
                end={item.url === "/admin"}
                onClick={closeMobileSidebar}
                className={navigationStyles.link}
                activeClassName=""
              >
                <item.icon
                  className={navigationStyles.itemIcon}
                />

                <span className={navigationStyles.itemLabel}>
                  {item.title}
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="gw-navigation-panel">
      {/* ── Logo Header ── */}
      <button
        type="button"
        onClick={() => {
          navigate("/admin");
          closeMobileSidebar();
        }}
        title="Go to Admin Dashboard"
        className={navigationStyles.brand}
      >
        <div className={navigationStyles.brandIcon}>
          <GreenWayLogo className={navigationStyles.logo} />
        </div>

        <div
          className={navigationStyles.brandText}
        >
          <div className="flex items-center gap-1.5">
            <GreenWayLogo variant="wordmark" alt="GreenWay" className={navigationStyles.brandName} />
          </div>
          <p className={navigationStyles.brandCaption}>
            Candelaria, Quezon
          </p>
        </div>
      </button>

      {/* ── Nav Groups ── */}
      <SidebarContent className={navigationStyles.content}>
        {navGroups.map((group) => {
          if (!group.collapsible) {
            return (
              <SidebarGroup key={group.label} className="p-0">
                <SidebarGroupLabel className={navigationStyles.sectionLabel}>
                  {navigationSectionTitle(group.label)}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  {renderMenuItems(group.items)}
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible key={group.label} defaultOpen className="group/collapsible">
              <SidebarGroup className="p-0">
                <CollapsibleTrigger className={navigationStyles.sectionTrigger}>
                  <span className={navigationStyles.sectionText}>
                    {navigationSectionTitle(group.label)}
                  </span>
                  <ChevronDown className="w-3 h-3 text-sidebar-muted-foreground transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
                </CollapsibleTrigger>

                <CollapsibleContent forceMount className="gw-navigation-group-content">
                  <SidebarGroupContent>
                    {renderMenuItems(group.items)}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className={navigationStyles.footer}>
        <div
          className={navigationStyles.account}
        >
          <div ref={gearMenuRef} className={navigationStyles.accountRow}>
            <div className="relative shrink-0">
              <Avatar className={navigationStyles.avatar}>
                <AvatarImage src={profileAvatarImageSrc(profileAvatarForCurrentUser(currentUser?.id, currentUser?.avatar_url, "ADMIN"))} alt="" className="object-cover object-center" />
                <AvatarFallback className={navigationStyles.avatarFallback}>
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
                <p className={navigationStyles.accountRole}>
                  Admin
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

            {showGearMenu && !collapsed && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border/80 rounded-xl shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  className={navigationStyles.accountMenuItem}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowGearMenu(false);
                    navigate("/admin/profile");
                    closeMobileSidebar();
                  }}
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" /> Profile
                </button>
                <button
                  type="button"
                  className={navigationStyles.accountMenuItem}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowGearMenu(false);
                    navigate("/admin/settings");
                    closeMobileSidebar();
                  }}
                >
                  <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                </button>
              </div>
            )}
          </div>

          <div className={navigationStyles.divider} />

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

        <ConfirmationDialog
          kind="dialog"
          open={showLogoutModal}
          onOpenChange={setShowLogoutModal}
          title="Sign Out of This Tab?"
          description="You can sign in again here. Other tabs will stay signed in."
          icon={<LogOut />}
          variant="destructive"
          confirmLabel="Sign Out"
          onConfirm={handleLogout}
          pendingLabel="Logging out…"
        />
      </SidebarFooter>

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

export default AdminSidebar;
