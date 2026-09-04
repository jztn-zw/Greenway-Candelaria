import {
  LayoutDashboard,
  Map,
  History,
  Bell,
  LogOut,
  Settings,
  UserCircle,
  Sun,
  Moon,
  Headphones,
  Building2,
  Phone,
  ChevronLeft,
  ChevronRight,
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
import { useState, useEffect } from "react";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";

const navGroups = [
  {
    label: "OVERVIEW",
    items: [{ title: "Dashboard", url: "/collector", icon: LayoutDashboard }],
  },
  {
    label: "OPERATIONS",
    items: [
      { title: "Route & Map", url: "/collector/route-map", icon: Map },
      { title: "Route History", url: "/collector/route-history", icon: History },
    ],
  },
  {
    label: "NOTIFICATION",
    items: [
      { title: "Notifications", url: "/collector/notifications", icon: Bell },
    ],
  },
];

const CollectorSidebar = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const fullName = currentUser?.full_name?.trim() || "Collector Driver";
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "CD";

  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [settingsRotation, setSettingsRotation] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const isActive = (path: string) =>
    path === "/collector"
      ? location.pathname === "/collector"
      : location.pathname.startsWith(path);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsRotation((prev) => prev + 180);
    setShowGearMenu(!showGearMenu);
  };

  const handleToggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setIsDarkMode(nextDark);
    setShowGearMenu(false);
  };

  useEffect(() => {
    const handleClose = () => setShowGearMenu(false);
    if (showGearMenu) {
      window.addEventListener("click", handleClose);
      return () => window.removeEventListener("click", handleClose);
    }
  }, [showGearMenu]);

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
            Collector Portal
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
                          ${
                            active
                              ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary"
                              : "text-foreground hover:bg-muted/50"
                          }
                          group-data-[collapsible=icon]:!w-11 group-data-[collapsible=icon]:!h-11 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto
                        `}
                      >
                        <NavLink
                          to={item.url}
                          end={item.url === "/collector"}
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
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
                  Collector · MENRO Candelaria
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettingsClick}
                className="p-1 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                aria-label="Settings"
              >
                <Settings
                  className="w-4 h-4 transition-transform duration-500 ease-in-out"
                  style={{ transform: `rotate(${settingsRotation}deg)` }}
                />
              </button>
            </div>

            {/* Gear dropdown popup with options */}
            {showGearMenu && !collapsed && (
              <div
                className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 divide-y divide-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-0.5">
                  <a
                    href="/collector/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors rounded-lg mx-1"
                    onClick={() => setShowGearMenu(false)}
                  >
                    <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Profile & Vehicle</span>
                  </a>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGearMenu(false);
                      setShowDispatchModal(true);
                    }}
                    className="flex items-center gap-2.5 w-[calc(100%-8px)] px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors rounded-lg mx-1 text-left cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Contact Dispatch</span>
                  </button>
                </div>
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
              transition-colors duration-200 font-semibold border-none bg-transparent cursor-pointer
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

        {/* ── Contact Dispatch Modal ── */}
        <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" /> Contact MENRO Dispatch
              </DialogTitle>
              <DialogDescription>
                Municipal Environment and Natural Resources Office (MENRO) Candelaria
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Main Office
                </p>
                <p className="text-muted-foreground">Municipal Hall Compound, Candelaria, Quezon</p>
                <p className="text-primary font-mono font-semibold pt-0.5">Hotline: (042) 585-4111</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-yellow-600" /> Emergency Breakdown & Towing
                </p>
                <p className="text-muted-foreground">24/7 Route Supervisor & Towing Assistance</p>
                <p className="text-yellow-600 font-mono font-semibold pt-0.5">Mobile: +63 917 123 4567</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowDispatchModal(false)} className="rounded-xl text-xs">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={toggleSidebar}
        className="absolute z-50 top-[76px] -translate-y-1/2 -right-3
          w-6 h-6 rounded-full
          bg-sidebar border border-border shadow-sm
          flex items-center justify-center
          hover:bg-muted transition-colors duration-200 cursor-pointer"
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

export default CollectorSidebar;
