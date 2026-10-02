import { AdminAlertSettingsSkeleton } from "@/components/PageLoadingSkeletons";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAdminAction, useAdminResource } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { useThemeMode } from "@/hooks/useThemeMode";
import { setThemeMode } from "@/lib/theme";
import { fetchAdminAlertSettings, updateAdminAlertSettings, type AdminAlertSettings } from "@/services/settingsService";
import { AlertTriangle, Bell, FileText, MessageSquare, Moon, Settings, Sun } from "lucide-react";
import { useState, type ElementType, type ReactNode } from "react";

const alertOptions: { key: keyof AdminAlertSettings; label: string; description: string; icon: ElementType }[] = [
  { key: "notif_admin_reports", label: "New resident reports", description: "Be alerted when a resident submits a waste report.", icon: FileText },
  { key: "notif_admin_route_issues", label: "Route and collection updates", description: "Get updates about route progress, missed collections, and tracking problems.", icon: AlertTriangle },
  { key: "notif_admin_driver_messages", label: "Driver messages", description: "Know when a collector sends an operational message.", icon: MessageSquare },
];

const defaultAlerts: AdminAlertSettings = {
  notif_admin_reports: true,
  notif_admin_route_issues: true,
  notif_admin_driver_messages: true,
};

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const Section = ({ title, subtitle, icon: Icon, children }: {
  title: string;
  subtitle: string;
  icon: ElementType;
  children: ReactNode;
}) => (
  <section className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 md:space-y-4 md:p-5 lg:p-6">
    <div className="flex items-center gap-2.5 border-b border-border/60 pb-2.5 lg:gap-3 lg:pb-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="gw-heading text-sm tracking-tight text-foreground lg:text-base">{title}</h2>
        <p className="mt-0.5 text-ui-caption leading-tight text-muted-foreground lg:text-xs">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const AdminSettings = () => {
  const dark = useThemeMode() === "dark";
  const { data: alerts, setData: setAlerts, dataUpdatedAt: alertsUpdatedAt, isFetching: alertsRefreshing, isLoading: alertsLoading, isError: alertsError, refetch: loadAlerts } =
    useAdminResource("settings", ["alerts"], fetchAdminAlertSettings, defaultAlerts);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const runAction = useAdminAction("settings");

  const changeTheme = (isDark: boolean) => {
    setThemeMode(isDark ? "dark" : "light");
  };

  const updateAlert = async (key: keyof AdminAlertSettings, checked: boolean) => {
    const previousAlerts = alerts;
    const nextAlerts = { ...alerts, [key]: checked };
    setAlerts(nextAlerts);
    setSavingAlerts(true);
    try {
      const updated = await runAction(() => updateAdminAlertSettings(nextAlerts));
      setAlerts(updated);
    } catch (error) {
      setAlerts(previousAlerts);
      toast.error(errorMessage(error, "Could not save alert preferences."));
    } finally {
      setSavingAlerts(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-in fade-in duration-300 md:space-y-5 lg:space-y-6">
      <header>
        <h1 className="gw-page-title tracking-tight text-foreground lg:text-ui-page-lg">Settings</h1>
        <p className="mt-0.5 text-xs text-muted-foreground lg:text-sm">Manage admin alerts and display preferences.</p>
      </header>

      <Section title="Admin Notifications" subtitle="Choose the operational alerts that matter to you" icon={Bell}>
        {alertsError && alertsUpdatedAt > 0 && <DataRefreshNotice message="Couldn't refresh alert preferences. Showing your last loaded settings." onRetry={() => void loadAlerts()} retrying={alertsRefreshing} />}
        {alertsLoading ? <AdminAlertSettingsSkeleton /> : alertsError && !alertsUpdatedAt ? <PageErrorState kind="unavailable" variant="section" title="Alert preferences couldn't load" onRetry={() => void loadAlerts()} retrying={alertsRefreshing} /> : <div className="space-y-1">
          {alertOptions.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="-mx-2 flex items-center justify-between gap-3 rounded-xl border-b border-border/40 px-2 py-2.5 last:border-b-0 lg:-mx-2.5 lg:px-2.5 lg:py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/70 text-muted-foreground"><Icon className="h-4 w-4" /></div>
                <div><p className="text-xs font-semibold text-foreground lg:text-sm">{label}</p><p className="mt-0.5 text-ui-caption leading-relaxed text-muted-foreground">{description}</p></div>
              </div>
              <Switch checked={alerts[key]} onCheckedChange={(checked) => void updateAlert(key, checked)} aria-label={label} className="shrink-0" disabled={alertsLoading || alertsError || savingAlerts} />
            </div>
          ))}
        </div>}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-ui-caption text-muted-foreground">{alertsError ? "Alert preferences could not load." : alertsLoading ? "Loading alert preferences..." : savingAlerts ? "Saving your preference..." : "Changes save automatically."}</p>
        </div>
      </Section>

      <Section title="Display" subtitle="Customize the appearance on this device" icon={Settings}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-tight text-foreground lg:text-sm">Theme Mode</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border/60 bg-muted/40 p-1">
            <button type="button" onClick={() => changeTheme(false)} aria-pressed={!dark}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all lg:text-sm ${!dark ? "border border-border/80 bg-card font-semibold text-foreground shadow-2xs" : "gw-action-ghost "}`}>
              <Sun className={`h-4 w-4 ${!dark ? "text-warning-foreground" : "text-muted-foreground"}`} /> Light Mode
            </button>
            <button type="button" onClick={() => changeTheme(true)} aria-pressed={dark}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all lg:text-sm ${dark ? "border border-border/80 bg-card font-semibold text-foreground shadow-2xs" : "gw-action-ghost "}`}>
              <Moon className={`h-4 w-4 ${dark ? "text-primary" : "text-muted-foreground"}`} /> Dark Mode
            </button>
          </div>
        </div>
      </Section>

    </div>
  );
};

export default AdminSettings;
