import { FormDialog } from "@/components/FormDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { useResidentQuery, useResidentMutation } from "@/lib/residentQuery";
import { useState, useEffect, useRef } from "react";
import {
  Bell, BellRing, Calendar, Shield, HelpCircle,
  Mail, ChevronRight,
  Sun, Moon, FileText, Truck, Megaphone,
  BookOpen, Lock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SettingsSkeleton } from "@/components/PageLoadingSkeletons";
import { fetchUserSettings, updateUserSettings, UpdateSettingsPayload } from "@/services/settingsService";
import { toast } from "@/lib/toast";
import { useThemeMode } from "@/hooks/useThemeMode";
import { setThemeMode } from "@/lib/theme";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";
import { settingsStyles } from "./settingsStyles";

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="resident-settings-info space-y-1 rounded-md border border-border/70 bg-muted/20 p-4">
    <h3 className="gw-heading text-sm text-foreground">{title}</h3>
    <div className="text-xs leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

/* Group related settings inside a shared section panel. */
interface SectionProps {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconStyle?: string;
  children: React.ReactNode;
}

const Section = ({ title, subtitle, icon: Icon, iconStyle, children }: SectionProps) => (
  <section className={settingsStyles.section}>
    <div className={settingsStyles.sectionHeader}>
      <div
        className={`${settingsStyles.icon} ${
          iconStyle || "bg-primary/10 text-primary border-primary/20"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={settingsStyles.sectionTitle}>
          {title}
        </h2>
        {subtitle && (
          <p className={settingsStyles.sectionDescription}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {children}
  </section>
);

/* ─── Premium Toggle Row ─── */
interface ToggleRowProps {
  label: string;
  description?: string;
  icon: React.ElementType;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

const ToggleRow = ({
  label,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
}: ToggleRowProps) => (
  <div className={settingsStyles.toggleRow}>
    <div className={settingsStyles.rowContent}>
      <div className={`${settingsStyles.icon} bg-primary/10 text-primary border-primary/20`}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={settingsStyles.rowLabel}>{label}</p>
        {description && (
          <p className={settingsStyles.rowDescription}>{description}</p>
        )}
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} className="shrink-0" />
  </div>
);

/* ─── Premium Action Row / Nav Link ─── */
interface ActionRowProps {
  label: string;
  description?: string;
  icon: React.ElementType;
  iconStyle?: string;
  onClick: () => void;
}

const ActionRow = ({
  label,
  description,
  icon: Icon,
  iconStyle,
  onClick,
}: ActionRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={settingsStyles.actionRow}
  >
    <div className={settingsStyles.rowContent}>
      <div
        className={`${settingsStyles.icon} transition-transform duration-200 ${
          iconStyle || "bg-muted/70 text-foreground/80 border-border/60"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs lg:text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
          {label}
        </span>
        {description && (
          <p className={settingsStyles.rowDescription}>{description}</p>
        )}
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
  </button>
);

/* ─── Main Component ─── */
const ResidentSettings = () => {
  const settingsQuery = useResidentQuery("settings", ["me"], fetchUserSettings);
  const saveSetting = useResidentMutation(updateUserSettings, "settings");
  const isLoading = settingsQuery.isLoading;
  const pendingWrites = useRef(0);

  // ── Notification toggles (consolidated) ──
  const [notifs, setNotifs] = useState({
    collectionAlerts: true,   // truck near + completed + skipped
    reportUpdates: true,      // report status changes
    newsAnnouncements: true,  // tips, community posts, announcements
  });

  const [collectionPrefs, setCollectionPrefs] = useState({
    reminderOn: true,
  });

  // ── Modals ──
  const [privacyModal, setPrivacyModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [faqModal, setFaqModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);

  const dark = useThemeMode() === "dark";

  const toggleTheme = (isDark: boolean) => {
    setThemeMode(isDark ? "dark" : "light");
  };

  // Hydrate saved values only while there are no local writes in flight.
  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings || pendingWrites.current) return;
    setNotifs({
      collectionAlerts: Boolean(settings.notif_collection_reminders || settings.notif_truck_near || settings.notif_collection_done || settings.notif_collection_skipped),
      reportUpdates: Boolean(settings.notif_report_updates),
      newsAnnouncements: Boolean(settings.notif_new_content || settings.notif_announcements),
    });
    setCollectionPrefs({ reminderOn: Boolean(settings.reminder_on) });
  }, [settingsQuery.data, settingsQuery.dataUpdatedAt]);

  const saveSettings = async (patch: UpdateSettingsPayload) => {
    pendingWrites.current += 1;
    try { await saveSetting(patch); }
    catch { toast.error("Failed to save setting. Please try again."); }
    finally {
      pendingWrites.current -= 1;
      if (!pendingWrites.current) void settingsQuery.refetch();
    }
  };

  // ── Notification toggle helper ──
  const toggleNotif = (key: keyof typeof notifs, value: boolean) => {
    setNotifs((prev) => ({ ...prev, [key]: value }));
    // Each consolidated key maps to multiple backend fields
    const payloads: Record<keyof typeof notifs, UpdateSettingsPayload> = {
      collectionAlerts: {
        notif_collection_reminders: value,
        notif_truck_near: value,
        notif_collection_done: value,
        notif_collection_skipped: value,
      },
      reportUpdates: { notif_report_updates: value },
      newsAnnouncements: {
        notif_new_content: value,
        notif_announcements: value,
      },
    };
    saveSettings(payloads[key]);
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }
  if (settingsQuery.isError && settingsQuery.data === undefined) return <PageErrorState kind="unavailable" description="We couldn't load your saved settings. Please try again." onRetry={() => void settingsQuery.refetch()} retrying={settingsQuery.isFetching} homeHref="/resident" />;

  return (
    <div className={settingsStyles.page}>
      {/* ── Page Header ── */}
      <div className={settingsStyles.header}>
        <div className="min-w-0">
          <h1 className={settingsStyles.title}>
            Settings
          </h1>
          <p className={settingsStyles.description}>
            Manage collection reminders, notification alerts, and display preferences
          </p>
        </div>
      </div>

      {settingsQuery.isError && <DataRefreshNotice message="Couldn't refresh settings. Showing your last loaded preferences." onRetry={() => void settingsQuery.refetch()} retrying={settingsQuery.isFetching} />}

      {/* ── 1. Collection Reminders ── */}
      <Section
        title="Collection Reminders"
        subtitle="Choose when to receive scheduled pickup alerts"
        icon={Calendar}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-1">
          {/* Collection Day Reminder Toggle */}
          <div className={settingsStyles.toggleRow}>
            <div className={settingsStyles.rowContent}>
              <div className={`${settingsStyles.icon} bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`}>
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={settingsStyles.rowLabel}>Collection Day Reminder</p>
                <p className={settingsStyles.rowDescription}>
                  Receive an automated alert 3 hours before scheduled municipal waste pickups
                </p>
              </div>
            </div>
            <Switch
              aria-label="Collection Day Reminder"
              checked={collectionPrefs.reminderOn}
              onCheckedChange={(v) => {
                setCollectionPrefs((p) => ({ ...p, reminderOn: v }));
                saveSettings({ reminder_on: v });
                toast.success(v ? "Collection reminder enabled" : "Collection reminder disabled");
              }}
              className="shrink-0"
            />
          </div>

        </div>
      </Section>

      {/* ── 2. Notification Alerts ── */}
      <Section
        title="Notification Alerts"
        subtitle="Control the notifications shown in your resident web portal"
        icon={Bell}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-1">
        <ToggleRow
            label="Live Truck Alerts"
            icon={Truck}
            description="Real-time alerts when the truck is near, collection is done, or pickup was skipped"
            checked={notifs.collectionAlerts}
            onCheckedChange={(v) => toggleNotif("collectionAlerts", v)}
          />
          <ToggleRow
            label="Report Updates"
            icon={FileText}
            description="Status changes whenever MENRO reviews or resolves your submitted reports"
            checked={notifs.reportUpdates}
            onCheckedChange={(v) => toggleNotif("reportUpdates", v)}
          />
          <ToggleRow
            label="News & Announcements"
            icon={Megaphone}
            description="Eco tips, community posts, and official municipal advisories"
            checked={notifs.newsAnnouncements}
            onCheckedChange={(v) => toggleNotif("newsAnnouncements", v)}
          />
        </div>

      </Section>

      {/* ── 3. Appearance ── */}
      <Section
        title="Display"
        subtitle="Customize interface theme"
        icon={Sun}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-4">
          {/* Theme Segmented Control */}
          <div className="space-y-2">
            <div className={settingsStyles.themeHeading}>
              <span className="text-xs lg:text-sm font-semibold text-foreground tracking-tight">Theme Mode</span>
              <span className="text-ui-caption text-muted-foreground">{dark ? "Dark Mode Active" : "Light Mode Active"}</span>
            </div>
            <div className={settingsStyles.themeGrid} role="group" aria-label="Theme mode">
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                aria-label="Use light mode"
                aria-pressed={!dark}
                className={`${settingsStyles.themeButton} ${
                  !dark
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                    : "gw-action-ghost "
                }`}
              >
                <Sun className={`w-4 h-4 ${!dark ? "text-warning-foreground" : "text-muted-foreground"}`} />
                <span className="resident-settings-theme-long">Light Mode</span>
                <span className="resident-settings-theme-short" aria-hidden="true">Light</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTheme(true)}
                aria-label="Use dark mode"
                aria-pressed={dark}
                className={`${settingsStyles.themeButton} ${
                  dark
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                    : "gw-action-ghost "
                }`}
              >
                <Moon className={`w-4 h-4 ${dark ? "text-primary" : "text-muted-foreground"}`} />
                <span className="resident-settings-theme-long">Dark Mode</span>
                <span className="resident-settings-theme-short" aria-hidden="true">Dark</span>
              </button>
            </div>
          </div>

        </div>
      </Section>

      {/* ── 4. Help & Support ── */}
      <Section
        title="Help & Support"
        subtitle="Frequently asked questions, direct MENRO hotline, and technical support"
        icon={HelpCircle}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-1">
          <ActionRow
            label="Frequently Asked Questions (FAQ)"
            description="Answers to common questions regarding garbage schedules, segregation, and reports"
            icon={BookOpen}
            iconStyle="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
            onClick={() => setFaqModal(true)}
          />
          <ActionRow
            label="Contact MENRO Candelaria"
            description="Official office location, hotline phone numbers, and operational hours"
            icon={Mail}
            iconStyle="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            onClick={() => setContactModal(true)}
          />
        </div>
      </Section>

      {/* ── 5. About & Legal ── */}
      <Section
        title="About & Legal"
        subtitle="Privacy compliance under Republic Act 10173 and community terms"
        icon={Shield}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-1">
          <ActionRow
            label="Privacy Policy"
            description="How your data is protected under the Philippine Data Privacy Act of 2012 (RA 10173)"
            icon={Lock}
            iconStyle="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            onClick={() => setPrivacyModal(true)}
          />
          <ActionRow
            label="Terms of Service"
            description="Community reporting rules and solid waste segregation compliance (RA 9003)"
            icon={FileText}
            iconStyle="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
            onClick={() => setTermsModal(true)}
          />
        </div>
      </Section>

      <div className={settingsStyles.footer}>
        <p>
          GreenWay Candelaria · Version 2.0.0 · Municipality of Candelaria, Quezon
        </p>
      </div>

      {/* ── Dialogs / Modals ── */}

      {/* Privacy Policy Modal */}
      <FormDialog open={privacyModal} onOpenChange={setPrivacyModal}
        className="resident-settings-dialog"
        title="Privacy Policy" description="How GreenWay handles your data." icon={<Shield />}
        footer={<Button type="button" variant="outline" className={modalStyles.cancelButton} onClick={() => setPrivacyModal(false)}>Understood</Button>}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong>GreenWay Candelaria</strong> is dedicated to safeguarding your personal information in strict compliance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
        </p>
        <InfoSection title="1. Personal Information Collected">
          <p>We collect your registered name, verified contact information, barangay address, and optional waste violation reports (including photos and GPS coordinates) submitted to MENRO.</p>
        </InfoSection>
        <InfoSection title="2. Purpose of Collection">
          <p>Your details are processed solely to facilitate municipal waste collection logistics, optimize truck routes, dispatch environmental officers, and provide direct status updates.</p>
        </InfoSection>
        <InfoSection title="3. Confidentiality & Security">
          <p>All citizen data remains strictly confidential and encrypted in transit. Data is accessible solely to authorized MENRO officers and will never be sold or publicly disclosed.</p>
        </InfoSection>
      </FormDialog>

      {/* Terms of Service Modal */}
      <FormDialog open={termsModal} onOpenChange={setTermsModal}
        className="resident-settings-dialog"
        title="Terms of Service" description="MENRO Candelaria guidelines." icon={<FileText />}
        footer={<Button type="button" variant="outline" className={modalStyles.cancelButton} onClick={() => setTermsModal(false)}>Close</Button>}
      >
        <InfoSection title="1. Community Reporting Standards">
          <p>Reports filed through GreenWay must be truthful and made in good faith. Knowingly filing false, malicious, or abusive reports is prohibited and may incur account penalties under local municipal ordinances.</p>
        </InfoSection>
        <InfoSection title="2. Waste Segregation Mandate (RA 9003)">
          <p>Residents must comply with Republic Act No. 9003 (Ecological Solid Waste Management Act). Biodegradable and non-biodegradable waste must be segregated and brought out according to designated barangay collection days.</p>
        </InfoSection>
        <InfoSection title="3. Live GPS & Operational Limits">
          <p>Truck GPS tracking and estimated arrival times are subject to road accessibility, weather conditions, and unexpected mechanical issues in Candelaria.</p>
        </InfoSection>
      </FormDialog>

      {/* FAQ Modal */}
      <FormDialog open={faqModal} onOpenChange={setFaqModal}
        className="resident-settings-dialog"
        title="Frequently Asked Questions" description="Waste collection in Candelaria." icon={<HelpCircle />}
        footer={<Button type="button" variant="outline" className={modalStyles.cancelButton} onClick={() => setFaqModal(false)}>Close</Button>}
      >
        <InfoSection title="What time does the collection truck arrive?">
          <p>
            Trucks typically begin routes at 6:00 AM on scheduled collection days. You can track your assigned truck in real time on the Collection Tracking page.
          </p>
        </InfoSection>
        <InfoSection title="Who can see my reported waste complaints?">
          <p>
            Your report details and contact info are only visible to authorized MENRO officers for inspection and dispatch. They are never published or shared publicly.
          </p>
        </InfoSection>
        <InfoSection title="What should I do if my collection was missed?">
          <p>
            You can file a "Missed Collection" report directly under the Submit Report page so MENRO can dispatch a follow-up crew to your street.
          </p>
        </InfoSection>
      </FormDialog>

      {/* Contact MENRO Modal */}
      <FormDialog open={contactModal} onOpenChange={setContactModal}
        className="resident-settings-dialog"
        title="Contact MENRO Office" description="Office contact information." icon={<Mail />}
        footer={<Button type="button" variant="outline" className={modalStyles.cancelButton} onClick={() => setContactModal(false)}>Close</Button>}
      >
        <InfoSection title="Office Location"><p>{MUNICIPAL_CONTACT.address}</p></InfoSection>
        <InfoSection title="Operating Hours"><p>{MUNICIPAL_CONTACT.hours}</p></InfoSection>
        <InfoSection title="Hotline & Email"><p>{MUNICIPAL_CONTACT.hotline} · {MUNICIPAL_CONTACT.email}</p></InfoSection>
      </FormDialog>

    </div>
  );
};

export default ResidentSettings;
