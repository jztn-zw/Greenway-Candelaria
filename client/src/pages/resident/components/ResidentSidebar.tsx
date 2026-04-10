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

const navGroups = [
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
        badge: 2,
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
      { title: "Notifications", url: "/resident/notifications", icon: Bell },
    ],
  },
];

const ResidentSidebar = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const fullName = currentUser?.full_name?.trim() || "Unknown User";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "RS";
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [settingsRotation, setSettingsRotation] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

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

                          <item.icon
                            className={`h-[18px] w-[18px] shrink-0 ${
                              active ? "text-primary" : "text-muted-foreground"
                            }`}
                          />

                          <span className="truncate flex-1 ml-3 group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>

                          {item.badge && (
                            <span
                              className="ml-auto bg-destructive text-destructive-foreground
                                text-[10px] font-bold rounded-full w-5 h-5
                                flex items-center justify-center
                                group-data-[collapsible=icon]:hidden"
                            >
                              {item.badge}
                            </span>
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
                  Resident · MENRO C…
                </p>
              </div>
              <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-500 ease-in-out" style={{ transform: `rotate(${settingsRotation}deg)` }} />
            </div>

            {showGearMenu && !collapsed && (
              <div className="absolute bottom-full right-0 mb-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
                <a
                  href="/resident/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserCircle className="w-4 h-4" /> Profile
                </a>
                <a
                  href="/resident/settings"
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
