import { navigationStyles, navigationSectionTitle } from "../navigationStyles";
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
    <Sidebar collapsible="icon" className="gw-navigation-panel">
      {/* ── Logo Header ── */}
      <button
        type="button"
        onClick={() => navigate("/collector")}
        title="Go to Driver Dashboard"
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
                          end={item.url === "/collector"}
                          className={navigationStyles.link}
                          activeClassName=""
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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
                <AvatarImage src={profileAvatarSrc(profileAvatarForCurrentUser(currentUser?.id, currentUser?.avatar_url, "DRIVER"))} alt="" className="object-cover object-center" />
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
                  Collector
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
              <div
                className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border/80 rounded-xl shadow-md py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={navigationStyles.accountMenuItem}
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
                  className={navigationStyles.accountMenuItem}
                >
                  <Headphones className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Contact Dispatch</span>
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

export default CollectorSidebar;
