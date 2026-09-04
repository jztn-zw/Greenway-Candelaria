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
  ChevronRight,
  ChevronDown,
  Navigation,
  CalendarDays,
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
    ],
  },
  {
    label: "SCHEDULE",
    collapsible: true,
    items: [
      { title: "Schedule Manager", url: "/admin/schedule", icon: CalendarDays },
      { title: "Route Manager", url: "/admin/routes", icon: Route },
    ],
  },
  {
    label: "ACCOUNTS",
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
      <SidebarFooter className="p-3">
        {/* Card Container matching exact requested layout */}
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
                  MENRO Candelaria
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
                  href="/admin/profile"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors rounded-md mx-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" /> Profile
                </a>
                <a
                  href="/admin/settings"
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
