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
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  hidden?: boolean;
}

interface NavGroup {
  label: string;
  collapsible: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
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

  const renderMenuItems = (items: NavItem[]) => (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      {items.filter((item) => !item.hidden).map((item) => {
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
                end={item.url === "/admin"}
                className="flex w-full h-full items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
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

                <span className="truncate flex-1 tracking-tight group-data-[collapsible=icon]:hidden">
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
      <button
        type="button"
        onClick={() => navigate("/admin")}
        title="Go to Admin Dashboard"
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
        {navGroups.map((group) => {
          if (!group.collapsible || collapsed) {
            return (
              <SidebarGroup key={group.label} className="p-0">
                <SidebarGroupLabel className="text-[10px] tracking-[0.08em] text-muted-foreground/60 font-bold uppercase mb-1 px-2.5 h-auto py-0.5 group-data-[collapsible=icon]:hidden select-none">
                  {group.label}
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
                <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-1 mb-0.5 rounded-lg hover:bg-muted/40 cursor-pointer group-data-[collapsible=icon]:hidden transition-colors">
                  <span className="text-[10px] tracking-[0.08em] text-muted-foreground/60 font-bold uppercase select-none">
                    {group.label}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/40 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90 group-hover:text-foreground/70" />
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
      <SidebarFooter className="p-2.5 border-t border-border/60 bg-sidebar/30">
        <div
          className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-2.5 shadow-2xs
            group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent"
        >
          <div className="flex items-center gap-2.5 relative">
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
                  MENRO Candelaria
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettingsClick}
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Settings"
              >
                <Settings
                  className="w-3.5 h-3.5 transition-transform duration-500 ease-in-out"
                  style={{ transform: `rotate(${settingsRotation}deg)` }}
                />
              </button>
            </div>

            {showGearMenu && !collapsed && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors rounded-lg mx-1"
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
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors rounded-lg mx-1"
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

          <div className="my-2 border-t border-border/60 group-data-[collapsible=icon]:hidden" />

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

export default AdminSidebar;
