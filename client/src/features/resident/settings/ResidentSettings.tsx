import { FormDialog } from "@/components/FormDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { useResidentQuery, useResidentMutation } from "@/lib/residentQuery";
import { useState, useEffect, useRef } from "react";
import {
  Bell, BellRing, Calendar, Shield, HelpCircle,
  Mail, ChevronRight,
  Sun, Moon, FileText,
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

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-4">
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
  <section className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 md:space-y-4 md:p-5 lg:p-6">
    <div className="flex items-center gap-2.5 border-b border-border/60 pb-2.5 lg:gap-3 lg:pb-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
          iconStyle || "bg-primary/10 text-primary border-primary/20"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="gw-heading text-sm lg:text-base text-foreground tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-ui-caption lg:text-xs text-muted-foreground mt-0.5 leading-tight">
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
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

const ToggleRow = ({
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleRowProps) => (
  <div className="-mx-2 flex items-center justify-between gap-3 rounded-xl border-b border-border/40 px-2 py-2.5 transition-colors hover:bg-muted/30 last:border-b-0 lg:-mx-2.5 lg:px-2.5 lg:py-3">
    <div className="min-w-0 flex-1">
      <p className="text-xs lg:text-sm text-foreground font-semibold tracking-tight">{label}</p>
      {description && (
        <p className="text-ui-caption text-muted-foreground leading-relaxed mt-0.5">{description}</p>
      )}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
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
    className="group -mx-2 flex w-[calc(100%+16px)] cursor-pointer items-center justify-between rounded-xl border-b border-border/40 px-2 py-2.5 text-left transition-all hover:bg-[var(--button-neutral-hover)] last:border-b-0 lg:-mx-2.5 lg:w-[calc(100%+20px)] lg:px-2.5 lg:py-3"
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform duration-200 ${
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
          <p className="text-ui-caption text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
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
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-300 md:space-y-5 lg:space-y-6">
      {/* ── Page Header ── */}
      <div className="hidden flex-col gap-2.5 md:flex md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="gw-page-title lg:text-ui-page-lg text-foreground tracking-tight">
            Settings
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
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
          <div className="-mx-2 flex items-center justify-between gap-3 rounded-xl border-b border-border/40 px-2 py-2.5 transition-colors hover:bg-muted/30 lg:-mx-2.5 lg:px-2.5 lg:py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-semibold text-foreground tracking-tight">Collection Day Reminder</p>
                <p className="text-ui-caption text-muted-foreground mt-0.5 leading-relaxed">
                  Receive an automated alert 3 hours before scheduled municipal waste pickups
                </p>
              </div>
            </div>
            <Switch
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
            description="Real-time alerts when the truck is near, collection is done, or pickup was skipped"
            checked={notifs.collectionAlerts}
            onCheckedChange={(v) => toggleNotif("collectionAlerts", v)}
          />
          <ToggleRow
            label="Report Updates"
            description="Status changes whenever MENRO reviews or resolves your submitted reports"
            checked={notifs.reportUpdates}
            onCheckedChange={(v) => toggleNotif("reportUpdates", v)}
          />
          <ToggleRow
            label="News & Announcements"
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
            <div className="flex items-center justify-between">
              <span className="text-xs lg:text-sm font-semibold text-foreground tracking-tight">Theme Mode</span>
              <span className="text-ui-caption text-muted-foreground">{dark ? "Dark Mode Active" : "Light Mode Active"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer ${
                  !dark
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                    : "gw-action-ghost "
                }`}
              >
                <Sun className={`w-4 h-4 ${!dark ? "text-warning-foreground" : "text-muted-foreground"}`} />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTheme(true)}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer ${
                  dark
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-semibold"
                    : "gw-action-ghost "
                }`}
              >
                <Moon className={`w-4 h-4 ${dark ? "text-primary" : "text-muted-foreground"}`} />
                <span>Dark Mode</span>
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

      <div className="text-center py-2">
        <p className="text-ui-caption text-muted-foreground/70 font-medium">
          GreenWay Candelaria · Version 2.0.0 · Municipality of Candelaria, Quezon
        </p>
      </div>

      {/* ── Dialogs / Modals ── */}

      {/* Privacy Policy Modal */}
      <FormDialog open={privacyModal} onOpenChange={setPrivacyModal}
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
        title="Frequently Asked Questions" description="Waste collection in Candelaria." icon={<HelpCircle />}
        footer={<Button type="button" variant="outline" className={modalStyles.cancelButton} onClick={() => setFaqModal(false)}>Close</Button>}
      >
        <InfoSection title="What time does the collection truck arrive?">
          <p>
            Trucks typically begin routes at 6:00 AM on scheduled collection days. You can track your assigned truck in real time on the Truck Tracking page.
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
