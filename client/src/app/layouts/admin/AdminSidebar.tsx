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
  ClipboardList,
  Bell,
  LogOut,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronDown,
  Navigation,
  CalendarDays,
  MapPinned,
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
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { profileAvatarForCurrentUser, profileAvatarSrc } from "@/components/common/profileAvatars";
import useAuthStore from "@/store/authStore";
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
    ],
  },
  {
    label: "COLLECTION OPERATIONS",
    collapsible: true,
    items: [
      { title: "Schedule Manager", url: "/admin/schedule", icon: CalendarDays },
      { title: "Route Manager", url: "/admin/routes", icon: Route },
      { title: "Barangay Manager", url: "/admin/barangays", icon: MapPinned },
    ],
  },
  {
    label: "ACCOUNT MANAGEMENT",
    collapsible: true,
    items: [
      { title: "Resident Manager", url: "/admin/residents", icon: Users },
      { title: "Collector Manager", url: "/admin/drivers", icon: Truck },
    ],
  },
  {
    label: "OPERATIONS",
    collapsible: true,
    items: [
      { title: "Waste Reports", url: "/admin/reports", icon: AlertTriangle },
      { title: "Truck Tracking", url: "/admin/tracking", icon: Navigation },
    ],
  },
  {
    label: "ANALYTICS",
    collapsible: true,
    items: [
      { title: "Analytics Dashboard", url: "/admin/analytics", icon: BarChart3 },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList },
    ],
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
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [showGearMenu, setShowGearMenu] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

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

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    navigate("/", { replace: true });
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
                className={navigationStyles.link}
                activeClassName=""
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
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
        onClick={() => navigate("/admin")}
        title="Go to Admin Dashboard"
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
                  <ChevronDown className="w-3 h-3 text-muted-foreground/40 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90 group-hover:text-foreground/70" />
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
                <AvatarImage src={profileAvatarSrc(profileAvatarForCurrentUser(currentUser?.id, currentUser?.avatar_url, "ADMIN"))} alt="" className="object-cover object-center" />
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
          title="Log Out of GreenWay?"
          description="Are you sure you want to end your active session? You will need your credentials to sign back in."
          icon={<LogOut />}
          variant="destructive"
          confirmLabel="Log Out"
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
