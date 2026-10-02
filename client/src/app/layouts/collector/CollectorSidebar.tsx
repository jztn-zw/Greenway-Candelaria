import {
  LayoutDashboard,
  Map,
  CalendarDays,
  History,
  Bell,
  LogOut,
  Settings,
  UserCircle,
  Sun,
  Moon,
  Headphones,
  Phone,
  Mail,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";
import { useThemeMode } from "@/hooks/useThemeMode";
import { toggleThemeMode } from "@/lib/theme";
import CollectorLogoutDialog from "@/features/collector/components/CollectorLogoutDialog";
import { CollectorModalHeader } from "@/features/collector/components/CollectorModal";
import { collectorModalStyles as modalStyles } from "@/features/collector/components/collectorModalStyles";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { profileAvatarForCurrentUser, profileAvatarSrc } from "@/components/common/profileAvatars";
import useAuthStore from "@/store/authStore";
import { cn } from "@/lib/utils";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";

const navGroups = [
  {
    label: "OVERVIEW",
    items: [{ title: "Collector dashboard", url: "/collector", icon: LayoutDashboard }],
  },
  {
    label: "OPERATIONS",
    items: [
      { title: "Live route tracking", url: "/collector/route-map", icon: Map },
      { title: "Schedule", url: "/collector/schedule", icon: CalendarDays },
      { title: "Route History", url: "/collector/route-history", icon: History },
    ],
  },
  {
    label: "NOTIFICATIONS",
    items: [
      { title: "Notifications", url: "/collector/notifications", icon: Bell },
    ],
  },
];

const CollectorSidebar = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
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
  const gearMenuRef = useRef<HTMLDivElement>(null);
  const isDarkMode = useThemeMode() === "dark";
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const isActive = (path: string) =>
    path === "/collector"
      ? location.pathname === "/collector"
      : location.pathname.startsWith(path);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGearMenu((isOpen) => !isOpen);
  };

  const handleToggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleThemeMode();
    setShowGearMenu(false);
  };

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

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
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
            <span className="font-display text-ui-title font-semibold text-foreground tracking-tight leading-none">
              GreenWay
            </span>
          </div>
          <p className="text-ui-caption font-medium text-muted-foreground truncate mt-1 leading-none">
            MENRO Candelaria
          </p>
        </div>
      </button>

      {/* ── Nav Groups ── */}
      <SidebarContent className="py-3 px-2.5 flex flex-col gap-2.5 group-data-[collapsible=icon]:px-1.5 overflow-y-auto">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="text-ui-overline tracking-[0.08em] text-muted-foreground/60 font-bold uppercase mb-1 px-2.5 h-auto py-0.5 group-data-[collapsible=icon]:hidden select-none">
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
                          "relative h-9 px-2.5 rounded-xl font-medium text-xs sm:text-ui-label transition-all duration-150 select-none group",
                          active
                            ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20 hover:bg-primary/15 hover:text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60 ",
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
          className="rounded-xl border border-border/80 bg-card p-2.5
 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent"
        >
          {/* Top user profile row */}
          <div ref={gearMenuRef} className="flex items-center gap-2.5 relative">
            <div className="relative shrink-0">
              <Avatar className="w-9 h-9 rounded-xl border border-border/80 shadow-2xs">
                <AvatarImage src={profileAvatarSrc(profileAvatarForCurrentUser(currentUser?.id, currentUser?.avatar_url, "DRIVER"))} alt="" className="object-cover object-center" />
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold rounded-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div
              className="flex flex-1 items-center justify-between min-w-0 overflow-hidden
 transition-all duration-200 group-data-[collapsible=icon]:hidden"
            >
              <div className="min-w-0 flex-1 pr-1">
                <p className="text-xs font-semibold font-body text-foreground truncate leading-tight">
                  {fullName}
                </p>
                <p className="text-ui-caption text-muted-foreground truncate leading-none mt-1">
                  Collector
                </p>
              </div>

              <button
                type="button"
                onClick={handleSettingsClick}
                className="gw-action-ghost h-7 w-7 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
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
              <div
                className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border/80 rounded-xl shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-[var(--button-neutral-hover)] cursor-pointer"
                  onClick={() => {
                    setShowGearMenu(false);
                    navigate("/collector/profile");
                  }}
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Profile & Vehicle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGearMenu(false);
                    setShowDispatchModal(true);
                  }}
                  className="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-[var(--button-neutral-hover)] cursor-pointer"
                >
                  <Headphones className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Contact Dispatch</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-2 border-t border-border/60 group-data-[collapsible=icon]:hidden" />

          {/* Logout button row */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="gw-action-destructive-ghost flex items-center gap-2 w-full h-8 px-2.5 rounded-lg text-xs transition-colors duration-150 font-semibold border-none cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mt-1.5"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-destructive" />
            <span className="group-data-[collapsible=icon]:hidden text-xs font-bold text-destructive truncate">
              Sign Out
            </span>
          </button>
        </div>

        <CollectorLogoutDialog
          open={showLogoutModal}
          onOpenChange={setShowLogoutModal}
          onConfirm={handleLogout}
        />

        {/* ── Contact Dispatch Modal ── */}
        <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
          <DialogContent className={modalStyles.content}>
            <CollectorModalHeader title="Contact MENRO dispatch" description="Office and vehicle support" icon={<Headphones />} onClose={() => setShowDispatchModal(false)} closeLabel="Close contact dispatch" />

            <div className={modalStyles.body}>
              <section className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="min-w-0">
                  <h3 className="gw-heading text-sm text-foreground">{MUNICIPAL_CONTACT.officeName}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{MUNICIPAL_CONTACT.address}</p>
                </div>
                <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                  <a href={MUNICIPAL_CONTACT.hotlineHref} className="flex items-center gap-2.5 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Phone className="size-4 shrink-0" /> Office hotline: {MUNICIPAL_CONTACT.hotline}
                  </a>
                  <a href={MUNICIPAL_CONTACT.emailHref} className="flex items-center gap-2.5 break-all text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Mail className="size-4 shrink-0 text-muted-foreground" /> {MUNICIPAL_CONTACT.email}
                  </a>
                </div>
              </section>

              <section className="rounded-md border border-border/70 p-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="gw-heading text-sm text-foreground">Vehicle breakdown?</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Use Report breakdown in Profile &amp; Vehicle to send the truck details and your location to admins.
                  </p>
                </div>
              </section>
            </div>

            <div className={modalStyles.footer}>
              <Button type="button" variant="outline" onClick={() => setShowDispatchModal(false)} className={modalStyles.cancelButton}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={toggleSidebar}
        className="gw-action-outline absolute z-50 top-[56px] -translate-y-1/2 -right-3 w-6 h-6 rounded-full shrink-0 border shadow-xs flex items-center justify-center transition-all cursor-pointer"
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
