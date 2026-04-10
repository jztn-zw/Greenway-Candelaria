import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Globe,
  CalendarDays,
  Route,
  Users,
  Truck,
  AlertTriangle,
  MapPin,
  BarChart3,
  ClipboardList,
  Bell,
  LogOut,
  Settings,
  UserCircle,
  
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Building2,
  Navigation,
} from "lucide-react";
import { NavLink } from "@/pages/shared/NavLink";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Toggle this to restore the Admin Account Manager menu item.
// Feature remains in code and route; this only hides it from the sidebar UI.
const SHOW_ADMIN_ACCOUNT_MANAGER = false;

const navGroups = [
  {
    label: "MAIN",
    collapsible: false,
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "CONTENT",
    collapsible: true,
    items: [
      { title: "Posts", url: "/admin/posts", icon: FileText },
      { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
      { title: "Landing Page Manager", url: "/admin/landing-manager", icon: Globe },
    ],
  },
  {
    label: "SCHEDULE",
    collapsible: true,
    items: [
      { title: "Collection Schedule", url: "/admin/schedule", icon: CalendarDays },
      { title: "Route Manager", url: "/admin/routes", icon: Route },
    ],
  },
  {
    label: "ACCOUNTS",
    collapsible: true,
    items: [
      { title: "Resident Manager", url: "/admin/residents", icon: Users },
      { title: "Collector Manager", url: "/admin/drivers", icon: Truck },
      { title: "Admin Account Manager", url: "/admin/admins", icon: Shield, hidden: !SHOW_ADMIN_ACCOUNT_MANAGER },
    ],
  },
  {
    label: "OPERATIONS",
    collapsible: true,
    items: [
      { title: "Waste Reports", url: "/admin/reports", icon: AlertTriangle },
      { title: "Truck Tracking", url: "/admin/tracking", icon: Navigation },
      { title: "Barangay Manager", url: "/admin/barangays", icon: Building2 },
      { title: "Pickup Points", url: "/admin/pickup-points", icon: MapPin },
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
  const currentUser = authService.getCurrentUser();
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
  const [settingsRotation, setSettingsRotation] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
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

  const renderMenuItems = (items: typeof navGroups[0]["items"]) => (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      {items.filter((item) => !item.hidden).map((item) => {
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
                end={item.url === "/admin"}
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

                <item.icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />

                <span className="truncate flex-1 ml-3 group-data-[collapsible=icon]:hidden">
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
            Admin Portal
          </p>
        </div>
      </div>

      {/* ── Nav Groups ── */}
      <SidebarContent className="py-4 px-3 flex flex-col gap-3 group-data-[collapsible=icon]:px-0 overflow-y-auto">
        {navGroups.map((group) => {
          // When sidebar is collapsed to icons, always show all items (no collapsing)
          if (!group.collapsible || collapsed) {
            return (
              <SidebarGroup key={group.label} className="p-0">
                <SidebarGroupLabel className="text-[10px] tracking-[0.12em] text-primary/60 font-semibold uppercase mb-1 px-2 h-auto group-data-[collapsible=icon]:hidden">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  {renderMenuItems(group.items)}
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          // Collapsible group (only when sidebar is expanded)
          return (
            <Collapsible key={group.label} defaultOpen className="group/collapsible">
              <SidebarGroup className="p-0">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-2 mb-1 cursor-pointer group-data-[collapsible=icon]:hidden">
                  <span className="text-[10px] tracking-[0.12em] text-primary/60 font-semibold uppercase">
                    {group.label}
                  </span>
                  <ChevronDown className="w-3 h-3 text-primary/40 transition-transform duration-200 group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                </CollapsibleTrigger>

                <CollapsibleContent>
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
      <SidebarFooter className="border-t border-border p-0">
        <div
          className="px-4 pb-4 pt-3 space-y-2
            group-data-[collapsible=icon]:px-0
            group-data-[collapsible=icon]:flex
            group-data-[collapsible=icon]:flex-col
            group-data-[collapsible=icon]:items-center"
        >
          <div
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg
              transition-colors duration-200 cursor-pointer relative
              group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto
              ${collapsed ? "" : "hover:bg-muted"}`}
            onClick={handleSettingsClick}
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div
              className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden
                transition-all duration-200 group-data-[collapsible=icon]:hidden"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate leading-none">
                  {fullName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  Admin · MENRO Candelaria
                </p>
              </div>
              <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-500 ease-in-out" style={{ transform: `rotate(${settingsRotation}deg)` }} />
            </div>

            {showGearMenu && !collapsed && (
              <div className="absolute bottom-full right-0 mb-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                <a
                  href="/admin/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserCircle className="w-4 h-4" /> Profile
                </a>
                <a
                  href="/admin/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings className="w-4 h-4" /> Settings
                </a>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm
              text-destructive hover:bg-destructive/10
              transition-colors duration-200 font-medium border-none bg-transparent
              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">
              Log Out
            </span>
          </button>
          <LogoutConfirmModal
            open={showLogoutModal}
            onOpenChange={setShowLogoutModal}
            onConfirm={() => {
              void handleLogout();
            }}
          />
        </div>
      </SidebarFooter>

      {/* ── Collapse Toggle ── */}
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

export default AdminSidebar;
