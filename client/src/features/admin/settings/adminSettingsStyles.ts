import { AlertTriangle,FileText,MessageSquare } from "lucide-react";
import type { AdminAlertSettings } from "@/services/settingsService";
import type { ElementType } from "react";
import "./adminSettings.css";

export const adminAlertOptions: { key: keyof AdminAlertSettings; label: string; description: string; icon: ElementType }[] = [
  { key: "notif_admin_reports", label: "New Resident Reports", description: "Be alerted when a resident submits a waste report.", icon: FileText },
  { key: "notif_admin_route_issues", label: "Route and Collection Updates", description: "Get updates about route progress, missed collections, and tracking problems.", icon: AlertTriangle },
  { key: "notif_admin_driver_messages", label: "Driver Messages", description: "Know when a collector sends an operational message.", icon: MessageSquare },
];

export const adminSettingsCopy = {
  title: "Settings",
  description: "Manage admin alerts and display preferences.",
  notificationsTitle: "Admin Notifications",
  notificationsDescription: "Choose the operational alerts that matter to you",
  saved: "Changes save automatically.",
  displayTitle: "Display",
  displayDescription: "Customize the appearance on this device",
  theme: "Theme Mode",
};

export const adminSettingsStyles = {
  page: "resident-page admin-settings mx-auto min-w-0 w-full max-w-3xl space-y-4 animate-in fade-in duration-300",
  section: "admin-settings-section min-w-0 space-y-3 rounded-xl border border-border/80 bg-card p-4",
  sectionHeader: "flex min-w-0 items-center gap-2.5 border-b border-border/60 pb-3",
  icon: "admin-settings-icon flex size-8 shrink-0 items-center justify-center rounded-xl border",
  sectionTitle: "admin-settings-section-title gw-heading text-sm tracking-tight text-foreground",
  sectionDescription: "mt-0.5 text-ui-caption leading-relaxed text-muted-foreground",
  row: "admin-settings-alert-row flex min-w-0 items-center justify-between gap-3 rounded-xl border-b border-border/40 py-3 last:border-b-0",
  rowContent: "flex min-w-0 flex-1 items-center gap-2.5",
  label: "admin-settings-label text-xs font-semibold text-foreground",
  rowDescription: "mt-0.5 text-ui-caption leading-relaxed text-muted-foreground",
  footer: "min-w-0 border-t border-border/60 pt-4",
  footerText: "text-ui-caption text-muted-foreground",
  themeGrid: "grid min-w-0 grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/40 p-1",
  themeButton: "admin-settings-theme-button flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
};
