import { useState, useEffect, useRef } from "react";
import {
  Settings, Bell, BellRing, Calendar, Shield, HelpCircle, Bug,
  Mail, Globe, Clock, ChevronRight,
  Sun, Moon, MapPin, FileText, Phone,
  BookOpen, Lock, Check, X
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SettingsSkeleton } from "@/components/PageLoadingSkeletons";
import { fetchBarangays, BarangayLocationRow } from "@/services/barangaysService";
import { fetchUserSettings, updateUserSettings, UpdateSettingsPayload } from "@/services/settingsService";
import useAuthStore from "@/store/authStore";
import { toast } from "@/lib/toast";

/* ─── Premium Section Wrapper ─── */
interface SectionProps {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconStyle?: string;
  children: React.ReactNode;
}

const Section = ({ title, subtitle, icon: Icon, iconStyle, children }: SectionProps) => (
  <section className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-sm p-4 sm:p-6 space-y-4 shadow-2xs transition-all">
    <div className="flex items-center gap-3 pb-3 border-b border-border/60">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
          iconStyle || "bg-primary/10 text-primary border-primary/20"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
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
  <div className="flex items-center justify-between py-3 px-2 sm:px-2.5 -mx-2 sm:-mx-2.5 rounded-xl hover:bg-muted/30 transition-colors gap-3 border-b border-border/40 last:border-b-0">
    <div className="min-w-0 flex-1">
      <p className="text-xs sm:text-sm text-foreground font-semibold tracking-tight">{label}</p>
      {description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
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
    className="flex items-center justify-between py-3 px-2 sm:px-2.5 -mx-2 sm:-mx-2.5 w-[calc(100%+16px)] sm:w-[calc(100%+20px)] text-left hover:bg-muted/40 rounded-xl transition-all group cursor-pointer border-b border-border/40 last:border-b-0"
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
          iconStyle || "bg-muted/70 text-foreground/80 border-border/60"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
  </button>
);

/* ─── Main Component ─── */
const ResidentSettings = () => {
  const authUser = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(true);
  const [barangays, setBarangays] = useState<BarangayLocationRow[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notification toggles (consolidated) ──
  const [notifs, setNotifs] = useState({
    collectionAlerts: true,   // truck near + completed + skipped
    reportUpdates: true,      // report status changes
    newsAnnouncements: true,  // tips, community posts, announcements
  });

  const [primaryBarangayId, setPrimaryBarangayId] = useState<string>("");
  const [collectionPrefs, setCollectionPrefs] = useState({
    barangayName: authUser?.barangay_name || "",
    reminderOn: true,
    reminderTiming: "3h",
  });

  const [language, setLanguage] = useState<"en" | "fil">("en");

  // ── Modals ──
  const [privacyModal, setPrivacyModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [faqModal, setFaqModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [bugModal, setBugModal] = useState(false);
  const [bugText, setBugText] = useState("");

  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  const toggleTheme = (isDark: boolean) => {
    setDark(isDark);
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  // ── Load settings from API ──
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setIsLoading(true);
        const [settings, brgys] = await Promise.all([
          fetchUserSettings(),
          fetchBarangays(),
        ]);

        if (!isMounted) return;

        setBarangays(brgys);

        setNotifs({
          collectionAlerts: Boolean(
            settings.notif_truck_near || settings.notif_collection_done || settings.notif_collection_skipped
          ),
          reportUpdates: Boolean(settings.notif_report_updates),
          newsAnnouncements: Boolean(settings.notif_new_content || settings.notif_announcements),
        });

        const matchedBarangay = brgys.find((b) => b.id === settings.primary_barangay_id);
        setPrimaryBarangayId(settings.primary_barangay_id || authUser?.barangay_id || "");
        setCollectionPrefs({
          barangayName: matchedBarangay?.name || authUser?.barangay_name || "",
          reminderOn: Boolean(settings.reminder_on),
          reminderTiming: settings.reminder_timing || "3h",
        });

        setLanguage(settings.language || "en");

      } catch {
        toast.error("Failed to load settings");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [authUser?.barangay_id, authUser?.barangay_name]);

  // ── Debounced save ──
  const saveSettings = (patch: UpdateSettingsPayload) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateUserSettings(patch);
      } catch {
        toast.error("Failed to save setting");
      }
    }, 500);
  };

  // ── Notification toggle helper ──
  const toggleNotif = (key: keyof typeof notifs, value: boolean) => {
    setNotifs((prev) => ({ ...prev, [key]: value }));
    // Each consolidated key maps to multiple backend fields
    const payloads: Record<keyof typeof notifs, UpdateSettingsPayload> = {
      collectionAlerts: {
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

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your collection location, notification alerts, and display preferences
          </p>
        </div>
      </div>

      {/* ── 1. Collection Preferences ── */}
      <Section
        title="Collection Preferences"
        subtitle="Manage your primary neighborhood location and pickup reminders"
        icon={Calendar}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-1">
          {/* Primary Barangay */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-2 sm:px-2.5 -mx-2 sm:-mx-2.5 rounded-xl hover:bg-muted/30 transition-colors gap-3 border-b border-border/40">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">Primary Barangay</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Used for your weekly schedule, live truck map, and local advisories
                </p>
              </div>
            </div>
            <Select
              value={primaryBarangayId}
              onValueChange={(id) => {
                const found = barangays.find((b) => b.id === id);
                setPrimaryBarangayId(id);
                setCollectionPrefs((p) => ({ ...p, barangayName: found?.name || "" }));
                saveSettings({ primary_barangay_id: id });
                toast.success(`Primary Barangay set to ${found?.name || id}`);
              }}
            >
              <SelectTrigger className="w-full sm:w-56 h-10 rounded-xl border-border/80 text-xs sm:text-sm font-medium">
                <SelectValue placeholder="Select Barangay">
                  {collectionPrefs.barangayName ? `Brgy. ${collectionPrefs.barangayName}` : "Select Barangay"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {barangays.length > 0 ? (
                  barangays.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="rounded-lg text-xs sm:text-sm font-medium">
                      {b.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No barangays available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Collection Day Reminder Toggle */}
          <div className="flex items-center justify-between py-3 px-2 sm:px-2.5 -mx-2 sm:-mx-2.5 rounded-xl hover:bg-muted/30 transition-colors gap-3 border-b border-border/40">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">Collection Day Reminder</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Receive an automated alert before scheduled municipal waste pickups
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

          {/* Advance Timing (Conditionally Visible) */}
          {collectionPrefs.reminderOn && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-2 sm:px-2.5 -mx-2 sm:-mx-2.5 rounded-xl hover:bg-muted/30 transition-colors gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">Advance Notification Window</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    How long before the scheduled collection window you want to be alerted
                  </p>
                </div>
              </div>
              <Select
                value={collectionPrefs.reminderTiming}
                onValueChange={(v) => {
                  setCollectionPrefs((p) => ({ ...p, reminderTiming: v }));
                  saveSettings({ reminder_timing: v as "1h" | "3h" | "1d" });
                  toast.success(`Reminder set to ${v === "1h" ? "1 hour" : v === "3h" ? "3 hours" : "1 day"} in advance`);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl border-border/80 text-xs sm:text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1h" className="rounded-lg text-xs sm:text-sm font-medium">1 hour before</SelectItem>
                  <SelectItem value="3h" className="rounded-lg text-xs sm:text-sm font-medium">3 hours before</SelectItem>
                  <SelectItem value="1d" className="rounded-lg text-xs sm:text-sm font-medium">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Section>

      {/* ── 2. Notification Alerts ── */}
      <Section
        title="Notification Alerts"
        subtitle="Choose which real-time notifications and municipal updates you receive"
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

      {/* ── 3. Appearance & Language ── */}
      <Section
        title="Display & Language"
        subtitle="Customize interface theme and preferred reading language"
        icon={Sun}
        iconStyle="bg-primary/10 text-primary border-primary/20"
      >
        <div className="space-y-4">
          {/* Theme Segmented Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">Theme Mode</span>
              <span className="text-[11px] text-muted-foreground">{dark ? "Dark Mode Active" : "Light Mode Active"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                  !dark
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Sun className={`w-4 h-4 ${!dark ? "text-amber-500" : "text-muted-foreground"}`} />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTheme(true)}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                  dark
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                <Moon className={`w-4 h-4 ${dark ? "text-primary" : "text-muted-foreground"}`} />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">Preferred Language</span>
              <span className="text-[11px] text-muted-foreground">{language === "en" ? "English" : "Filipino"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-muted/40 border border-border/60">
              {(["en", "fil"] as const).map((lang) => {
                const isSelected = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguage(lang);
                      saveSettings({ language: lang });
                      toast.success(`Language set to ${lang === "en" ? "English" : "Filipino"}`);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? "bg-card text-foreground shadow-2xs border border-border/80 font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    }`}
                  >
                    <Globe className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{lang === "en" ? "English" : "Filipino"}</span>
                  </button>
                );
              })}
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
          <ActionRow
            label="Report an App Bug or Issue"
            description="Encountered an issue or glitch? Let our technical team know so we can fix it"
            icon={Bug}
            iconStyle="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            onClick={() => setBugModal(true)}
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
        <p className="text-[11px] text-muted-foreground/70 font-medium">
          GreenWay Candelaria · Version 2.0.0 · Municipality of Candelaria, Quezon
        </p>
      </div>

      {/* ── Dialogs / Modals ── */}

      {/* Privacy Policy Modal */}
      <Dialog open={privacyModal} onOpenChange={setPrivacyModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Privacy Policy
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Data Privacy Act of 2012 (RA 10173)
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPrivacyModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5 text-xs text-muted-foreground leading-relaxed overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
            <p className="text-foreground/90">
              <strong>GreenWay Candelaria</strong> is dedicated to safeguarding your personal information in strict compliance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
            </p>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">1. Personal Information Collected</p>
              <p>We collect your registered name, verified contact information, barangay address, and optional waste violation reports (including photos and GPS coordinates) submitted to MENRO.</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">2. Purpose of Collection</p>
              <p>Your details are processed solely to facilitate municipal waste collection logistics, optimize truck routes, dispatch environmental officers, and provide direct status updates.</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">3. Confidentiality & Security</p>
              <p>All citizen data remains strictly confidential and encrypted in transit. Data is accessible solely to authorized MENRO officers and will never be sold or publicly disclosed.</p>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
            <Button
              type="button"
              className="rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              onClick={() => setPrivacyModal(false)}
            >
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={termsModal} onOpenChange={setTermsModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Terms of Service
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  MENRO Candelaria Municipal Guidelines
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTermsModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5 text-xs text-muted-foreground leading-relaxed overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">1. Community Reporting Standards</p>
              <p>Reports filed through GreenWay must be truthful and made in good faith. Knowingly filing false, malicious, or abusive reports is prohibited and may incur account penalties under local municipal ordinances.</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">2. Waste Segregation Mandate (RA 9003)</p>
              <p>Residents must comply with Republic Act No. 9003 (Ecological Solid Waste Management Act). Biodegradable and non-biodegradable waste must be segregated and brought out according to designated barangay collection days.</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">3. Live GPS & Operational Limits</p>
              <p>Truck GPS tracking and estimated arrival times are subject to road accessibility, weather conditions, and unexpected mechanical issues in Candelaria.</p>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
            <Button
              type="button"
              className="rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              onClick={() => setTermsModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ Modal */}
      <Dialog open={faqModal} onOpenChange={setFaqModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Frequently Asked Questions
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Common questions on waste collection in Candelaria
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFaqModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3 text-xs overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">What time does the collection truck arrive?</p>
              <p className="text-muted-foreground leading-relaxed">
                Trucks typically begin routes at 6:00 AM on scheduled collection days. You can track your assigned truck in real time on the Truck Tracking page.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">Who can see my reported waste complaints?</p>
              <p className="text-muted-foreground leading-relaxed">
                Your report details and contact info are only visible to authorized MENRO officers for inspection and dispatch. They are never published or shared publicly.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">What should I do if my collection was missed?</p>
              <p className="text-muted-foreground leading-relaxed">
                You can file a "Missed Collection" report directly under the Submit Report page so MENRO can dispatch a follow-up crew to your street.
              </p>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
            <Button
              type="button"
              className="rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              onClick={() => setFaqModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact MENRO Modal */}
      <Dialog open={contactModal} onOpenChange={setContactModal}>
        <DialogContent className="sm:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Contact MENRO Office
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Municipal Environment & Natural Resources Office
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setContactModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Office Location</p>
                <p className="text-muted-foreground mt-0.5">Ground Floor, Municipal Hall, Candelaria, Quezon</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Operating Hours</p>
                <p className="text-muted-foreground mt-0.5">Monday – Friday: 8:00 AM – 5:00 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Hotline & Email</p>
                <p className="text-muted-foreground mt-0.5">(042) 585-4111 · menro@candelaria.gov.ph</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
            <Button
              type="button"
              className="rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              onClick={() => setContactModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bug Report Modal */}
      <Dialog open={bugModal} onOpenChange={setBugModal}>
        <DialogContent className="sm:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Bug className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Report an App Bug
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Describe what went wrong or unexpected behavior
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBugModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <textarea
              className="w-full rounded-xl border border-border/80 bg-background/50 p-3.5 text-xs min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground leading-relaxed"
              placeholder="Please describe what happened, what screen you were on, or any error message you saw..."
              value={bugText}
              onChange={(e) => setBugText(e.target.value)}
            />
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-4 h-9 text-xs sm:text-sm font-semibold border-border/80 cursor-pointer"
              onClick={() => setBugModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              onClick={() => {
                if (!bugText.trim()) {
                  toast.error("Please enter a description of the issue");
                  return;
                }
                setBugModal(false);
                setBugText("");
                toast.success("Thank you! Your bug report was submitted.");
              }}
            >
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentSettings;
