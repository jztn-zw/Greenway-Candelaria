import { FormDialog } from "@/components/dialogs/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/dialogs/formDialogStyles";
import { useState } from "react";
import { useBrowserNotificationSettings } from "@/hooks/useBrowserNotificationSettings";
import {
Bell,BellRing,Shield,HelpCircle,
Mail,ChevronRight,
Sun,Moon,FileText,Truck,Megaphone,
BookOpen,Lock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/hooks/useThemeMode";
import { setThemeMode } from "@/lib/theme";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";
import { settingsStyles } from "./settingsStyles";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";

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
  disabled?: boolean;
}

const ToggleRow = ({
  label,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled,
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
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label} className="shrink-0" />
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
  const browser = useBrowserNotificationSettings();
  const browserEnabled = browser.settings.enabled && browser.permission === "granted";

  // ── Modals ──
  const [privacyModal, setPrivacyModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [faqModal, setFaqModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);

  const dark = useThemeMode() === "dark";

  const toggleTheme = (isDark: boolean) => {
    setThemeMode(isDark ? "dark" : "light");
  };

  return (
    <div className={settingsStyles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        title="Settings"
        description="Manage browser notifications and display preferences"
      />

      {/* Browser alerts are independent of phone push and the always-available inbox. */}
      <Section
        title="Browser Notifications"
        subtitle="Alerts in this browser while GreenWay is open, including background tabs. All updates always appear in your app and website inbox."
        icon={Bell}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-1">
          <ToggleRow label="Browser Notifications" icon={Bell}
            description="Enable alerts for this account in this browser. Phone push settings are managed in the mobile app."
            checked={browserEnabled} onCheckedChange={value => { void browser.update("enabled", value); }}
            disabled={browser.busy || browser.permission === "unsupported"} />
          {browser.permission === "unsupported" && <p role="status" className="text-xs text-muted-foreground py-2">Browser notifications need HTTPS and a supported browser.</p>}
          {browser.permission === "denied" && <p role="status" className="text-xs text-muted-foreground py-2">Notifications are blocked. Allow them in your browser’s site settings to enable alerts.</p>}
          {!!browser.error && <p role="alert" className="text-xs text-destructive py-2">{browser.error}</p>}
          <div className={settingsStyles.toggleRow}>
            <div className={settingsStyles.rowContent}>
              <div className={`${settingsStyles.icon} bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`}>
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={settingsStyles.rowLabel}>Collection Day Reminder</p>
                <p className={settingsStyles.rowDescription}>
                  Show collection reminders in this browser while GreenWay is open
                </p>
              </div>
            </div>
            <Switch
              aria-label="Collection Day Reminder"
              checked={browser.settings.reminders}
              disabled={!browserEnabled || browser.busy}
              onCheckedChange={value => { void browser.update("reminders", value); }}
              className="shrink-0"
            />
          </div>

        <ToggleRow
            label="Live Truck Alerts"
            icon={Truck}
            description="Real-time alerts when the truck is near, collection is done, or pickup was skipped"
            checked={browser.settings.collection}
            disabled={!browserEnabled || browser.busy}
            onCheckedChange={value => { void browser.update("collection", value); }}
          />
          <ToggleRow
            label="Report Updates"
            icon={FileText}
            description="Status changes whenever MENRO reviews or resolves your submitted reports"
            checked={browser.settings.reports}
            disabled={!browserEnabled || browser.busy}
            onCheckedChange={value => { void browser.update("reports", value); }}
          />
          <ToggleRow
            label="News & Announcements"
            icon={Megaphone}
            description="Eco tips, community posts, and official municipal advisories"
            checked={browser.settings.community}
            disabled={!browserEnabled || browser.busy}
            onCheckedChange={value => { void browser.update("community", value); }}
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
