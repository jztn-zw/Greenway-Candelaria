import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { AdminSettingsSkeleton } from "@/components/loading/PageLoadingSkeletons";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { Switch } from "@/components/ui/switch";
import { useAdminAction,useAdminResource } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { useThemeMode } from "@/hooks/useThemeMode";
import { setThemeMode } from "@/lib/theme";
import { fetchAdminAlertSettings,updateAdminAlertSettings,type AdminAlertSettings } from "@/services/settingsService";
import { Bell,Moon,Settings,Sun } from "lucide-react";
import { useState,type ElementType,type ReactNode } from "react";
import { adminAlertOptions,adminSettingsCopy as copy,adminSettingsStyles as styles } from "./adminSettingsStyles";

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
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <div className={`${styles.icon} border-primary/20 bg-primary/10 text-primary shadow-2xs`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionDescription}>{subtitle}</p>
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
    setSavingAlerts(true);
    try {
      const updated = await runAction(() => {
        setAlerts(nextAlerts);
        return updateAdminAlertSettings(nextAlerts);
      });
      setAlerts(updated);
    } catch (error) {
      setAlerts(previousAlerts);
      toast.error(errorMessage(error, "Could not save alert preferences."));
    } finally {
      setSavingAlerts(false);
    }
  };

  if (alertsLoading) return <AdminSettingsSkeleton />;

  return (
    <div className={styles.page}>
      <ResidentPageHeader
        className="admin-module-header"
        title={copy.title}
        description={copy.description}
      />

      <Section title={copy.notificationsTitle} subtitle={copy.notificationsDescription} icon={Bell}>
        {alertsError && alertsUpdatedAt > 0 && <DataRefreshNotice message="Couldn't refresh alert preferences. Showing your last loaded settings." onRetry={() => void loadAlerts()} retrying={alertsRefreshing} />}
        {alertsError && !alertsUpdatedAt ? <PageErrorState kind="unavailable" variant="section" title="Alert Preferences Couldn't Load" onRetry={() => void loadAlerts()} retrying={alertsRefreshing} /> : <div className="space-y-1">
          {adminAlertOptions.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className={styles.row}>
              <div className={styles.rowContent}>
                <div className={`${styles.icon} border-border/60 bg-muted/70 text-muted-foreground`}><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className={styles.label}>{label}</p><p className={styles.rowDescription}>{description}</p></div>
              </div>
              <Switch checked={alerts[key]} onCheckedChange={(checked) => void updateAlert(key, checked)} aria-label={label} className="shrink-0" disabled={alertsLoading || alertsError || savingAlerts} />
            </div>
          ))}
        </div>}
        <div className={styles.footer}>
          <p className={styles.footerText}>{alertsError ? "Alert preferences could not load." : savingAlerts ? "Saving your preference..." : copy.saved}</p>
        </div>
      </Section>

      <Section title={copy.displayTitle} subtitle={copy.displayDescription} icon={Settings}>
        <div className="space-y-2">
          <p className={`${styles.label} tracking-tight`}>{copy.theme}</p>
          <div className={styles.themeGrid}>
            <button type="button" onClick={() => changeTheme(false)} aria-pressed={!dark} aria-label="Light mode"
              className={`${styles.themeButton} cursor-pointer ${!dark ? "border-border/80 bg-card text-foreground shadow-2xs" : "border-transparent gw-action-ghost"}`}>
              <Sun className={`h-4 w-4 shrink-0 ${!dark ? "text-warning-foreground" : "text-muted-foreground"}`} />
              <span className="admin-settings-theme-long">Light Mode</span><span className="admin-settings-theme-short" aria-hidden="true">Light</span>
            </button>
            <button type="button" onClick={() => changeTheme(true)} aria-pressed={dark} aria-label="Dark mode"
              className={`${styles.themeButton} cursor-pointer ${dark ? "border-border/80 bg-card text-foreground shadow-2xs" : "border-transparent gw-action-ghost"}`}>
              <Moon className={`h-4 w-4 shrink-0 ${dark ? "text-primary" : "text-muted-foreground"}`} />
              <span className="admin-settings-theme-long">Dark Mode</span><span className="admin-settings-theme-short" aria-hidden="true">Dark</span>
            </button>
          </div>
        </div>
      </Section>

    </div>
  );
};

export default AdminSettings;
