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
import { cn } from "@/lib/utils";

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
      <button
        type="button"
        onClick={() => navigate("/collector")}
        title="Go to Driver Dashboard"
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
                          end={item.url === "/collector"}
                          className="flex w-full h-full items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                          activeClassName=""
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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
                  Collector · MENRO
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

            {/* Gear dropdown popup with options */}
            {showGearMenu && !collapsed && (
              <div
                className="absolute bottom-full right-0 mb-2 w-44 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 divide-y divide-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors rounded-lg mx-1"
                    onClick={() => {
                      setShowGearMenu(false);
                      navigate("/collector/profile");
                    }}
                  >
                    <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Profile & Vehicle</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGearMenu(false);
                      setShowDispatchModal(true);
                    }}
                    className="flex items-center gap-2.5 w-[calc(100%-8px)] px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors rounded-lg mx-1 text-left cursor-pointer"
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

        {/* ── Contact Dispatch Modal ── */}
        <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
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
                  <Phone className="w-4 h-4 text-amber-500" /> Emergency Breakdown & Towing
                </p>
                <p className="text-muted-foreground">24/7 Route Supervisor & Towing Assistance</p>
                <p className="text-amber-500 font-mono font-semibold pt-0.5">Mobile: +63 917 123 4567</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowDispatchModal(false)} className="rounded-xl text-xs h-9 px-4">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

export default CollectorSidebar;
