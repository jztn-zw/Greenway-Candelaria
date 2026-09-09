import { useState, useEffect, useRef } from "react";
import {
  Settings, Bell, Calendar, Shield, HelpCircle, Bug,
  Mail, Globe, Clock, ChevronRight,
  FileText, Megaphone, Truck, Sun, Moon, MapPin, Phone
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

/* ─── Section Wrapper ─── */
const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/80 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-primary" /> {title}
    </h2>
    {children}
  </section>
);

/* ─── Toggle Row ─── */
const ToggleRow = ({
  label, description, icon: Icon, checked, onCheckedChange,
}: {
  label: string; description?: string; icon: React.ElementType; checked: boolean; onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0 gap-3">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-foreground font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

/* ─── Main Component ─── */
const ResidentSettings = () => {
  const authUser = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(true);
  const [barangays, setBarangays] = useState<BarangayLocationRow[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notification toggles (simple on/off) ──
  const [notifs, setNotifs] = useState({
    collectionReminders: true,
    truckNear: true,
    collectionDone: true,
    collectionSkipped: true,
    reportUpdates: true,
    newContent: true,
    announcements: true,
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

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
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
          collectionReminders: Boolean(settings.notif_collection_reminders),
          truckNear: Boolean(settings.notif_truck_near),
          collectionDone: Boolean(settings.notif_collection_done),
          collectionSkipped: Boolean(settings.notif_collection_skipped),
          reportUpdates: Boolean(settings.notif_report_updates),
          newContent: Boolean(settings.notif_new_content),
          announcements: Boolean(settings.notif_announcements),
        });

        const matchedBarangay = brgys.find((b) => b.id === settings.primary_barangay_id);
        setPrimaryBarangayId(settings.primary_barangay_id || authUser?.barangay_id || "");
        setCollectionPrefs({
          barangayName: matchedBarangay?.name || authUser?.barangay_name || "",
          reminderOn: Boolean(settings.reminder_on),
          reminderTiming: settings.reminder_timing,
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
    const dbKeyMap: Record<keyof typeof notifs, keyof UpdateSettingsPayload> = {
      collectionReminders: "notif_collection_reminders",
      truckNear: "notif_truck_near",
      collectionDone: "notif_collection_done",
      collectionSkipped: "notif_collection_skipped",
      reportUpdates: "notif_report_updates",
      newContent: "notif_new_content",
      announcements: "notif_announcements",
    };
    saveSettings({ [dbKeyMap[key]]: value });
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your collection area, notification alerts, and preferences
          </p>
        </div>
      </div>

      {/* ── 1. Collection Preferences ── */}
      <Section title="Collection Preferences" icon={Calendar}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Primary Barangay</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Used for your collection schedule and truck map</p>
              </div>
            </div>
            <Select
              value={primaryBarangayId}
              onValueChange={(id) => {
                const found = barangays.find((b) => b.id === id);
                setPrimaryBarangayId(id);
                setCollectionPrefs((p) => ({ ...p, barangayName: found?.name || "" }));
                saveSettings({ primary_barangay_id: id });
                toast.success(`Primary Barangay updated to ${found?.name || id}`);
              }}
            >
              <SelectTrigger className="w-48 sm:w-56 h-9 text-sm">
                <SelectValue placeholder="Select Barangay">
                  {collectionPrefs.barangayName || "Select Barangay"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {barangays.length > 0 ? (
                  barangays.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="">No barangays available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Collection Day Reminder</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Get notified in advance on garbage collection days</p>
              </div>
            </div>
            <Switch
              checked={collectionPrefs.reminderOn}
              onCheckedChange={(v) => {
                setCollectionPrefs((p) => ({ ...p, reminderOn: v }));
                saveSettings({ reminder_on: v });
                toast.success(v ? "Collection reminder enabled" : "Collection reminder disabled");
              }}
            />
          </div>

          {collectionPrefs.reminderOn && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Remind Me</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">How early before the scheduled collection</p>
                </div>
              </div>
              <Select
                value={collectionPrefs.reminderTiming}
                onValueChange={(v) => {
                  setCollectionPrefs((p) => ({ ...p, reminderTiming: v }));
                  saveSettings({ reminder_timing: v as "1h" | "3h" | "1d" });
                  toast.success(`Reminder set to ${v === "1h" ? "1 hour" : v === "3h" ? "3 hours" : "1 day"} before collection`);
                }}
              >
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="3h">3 hours before</SelectItem>
                  <SelectItem value="1d">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Section>

      {/* ── 2. Notifications ── */}
      <Section title="Notifications" icon={Bell}>
        <div>
          <ToggleRow
            label="Truck Is Near Alert" icon={Truck}
            description="Alerts when the garbage truck is approaching your area"
            checked={notifs.truckNear}
            onCheckedChange={(v) => toggleNotif("truckNear", v)}
          />
          <ToggleRow
            label="Collection Completed" icon={Calendar}
            description="Alerts when collection in your barangay has been completed"
            checked={notifs.collectionDone}
            onCheckedChange={(v) => toggleNotif("collectionDone", v)}
          />
          <ToggleRow
            label="Collection Skipped" icon={Bell}
            description="Alerts when collection in your barangay is skipped, including the reason"
            checked={notifs.collectionSkipped}
            onCheckedChange={(v) => toggleNotif("collectionSkipped", v)}
          />
          <ToggleRow
            label="Collection Reminders" icon={Calendar}
            description="Reminders before your scheduled collection days"
            checked={notifs.collectionReminders}
            onCheckedChange={(v) => toggleNotif("collectionReminders", v)}
          />
          <ToggleRow
            label="Report Status Updates" icon={FileText}
            description="Updates whenever MENRO reviews or resolves your waste report"
            checked={notifs.reportUpdates}
            onCheckedChange={(v) => toggleNotif("reportUpdates", v)}
          />
          <ToggleRow
            label="New Posts & Waste Tips" icon={FileText}
            description="Alerts when MENRO publishes new waste tips, articles, or community events"
            checked={notifs.newContent}
            onCheckedChange={(v) => toggleNotif("newContent", v)}
          />
          <ToggleRow
            label="MENRO Announcements" icon={Megaphone}
            description="Important advisories, holiday changes, and emergency notices"
            checked={notifs.announcements}
            onCheckedChange={(v) => toggleNotif("announcements", v)}
          />
        </div>
      </Section>

      {/* ── 3. Appearance ── */}
      <Section title="Appearance" icon={Sun}>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {dark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-[11px] text-muted-foreground">Switch between light and dark interface themes</p>
            </div>
          </div>
          <Switch checked={dark} onCheckedChange={toggleTheme} />
        </div>
      </Section>

      {/* ── 4. Language Preference ── */}
      <Section title="Language Preference" icon={Globe}>
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">Select your preferred display language</p>
          <div className="flex gap-3">
            {(["en", "fil"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  saveSettings({ language: lang });
                  toast.success(`Language set to ${lang === "en" ? "English" : "Filipino"}`);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  language === lang
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {lang === "en" ? "English" : "Filipino"}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 5. About & Privacy ── */}
      <Section title="About & Legal" icon={Shield}>
        <div className="space-y-1">
          <button
            onClick={() => setPrivacyModal(true)}
            className="flex items-center justify-between py-3 w-full text-left border-b border-border hover:bg-muted/30 rounded-md px-1 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Privacy Policy</span>
                <p className="text-[11px] text-muted-foreground">How your data is protected under RA 10173</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setTermsModal(true)}
            className="flex items-center justify-between py-3 w-full text-left hover:bg-muted/30 rounded-md px-1 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Terms of Service</span>
                <p className="text-[11px] text-muted-foreground">Guidelines for reporting and waste management rules</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </Section>

      {/* ── 6. Help & Support ── */}
      <Section title="Help & Support" icon={HelpCircle}>
        <div className="space-y-1 pb-1">
          <button
            onClick={() => setFaqModal(true)}
            className="flex items-center justify-between py-3 w-full text-left border-b border-border hover:bg-muted/30 rounded-md px-1 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Frequently Asked Questions (FAQ)</span>
                <p className="text-[11px] text-muted-foreground">Answers to common schedule and reporting questions</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setContactModal(true)}
            className="flex items-center justify-between py-3 w-full text-left border-b border-border hover:bg-muted/30 rounded-md px-1 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Contact MENRO</span>
                <p className="text-[11px] text-muted-foreground">Office hours, phone number, and location</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setBugModal(true)}
            className="flex items-center justify-between py-3 w-full text-left hover:bg-muted/30 rounded-md px-1 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Bug className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Report an App Bug</span>
                <p className="text-[11px] text-muted-foreground">Let us know if something isn't working right</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </Section>

      <div className="h-8" />

      {/* ── Dialogs / Modals ── */}

      {/* Privacy Policy Modal */}
      <Dialog open={privacyModal} onOpenChange={setPrivacyModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Privacy Policy
            </DialogTitle>
            <DialogDescription>
              Republic of the Philippines · Municipality of Candelaria, Quezon
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground space-y-3 pt-2 leading-relaxed">
            <p>
              <strong>GreenWay Candelaria</strong> is committed to protecting your personal data in accordance with the <strong>Philippine Data Privacy Act of 2012 (RA 10173)</strong>.
            </p>
            <div>
              <p className="font-semibold text-foreground mb-1">1. Information We Collect</p>
              <p>We collect your name, contact information, barangay residence, and waste violation reports (including photos and GPS coordinates) submitted to MENRO.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">2. How We Use Information</p>
              <p>Your data is used solely for garbage collection routing, dispatching sanitation teams, and communicating updates regarding community environmental concerns.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">3. Confidentiality & Data Protection</p>
              <p>Your contact details and reported information are strictly confidential and only accessible to authorized municipal officers for dispatching services. They are never shared with the public or truck drivers.</p>
            </div>
          </div>
          <div className="flex justify-end pt-3">
            <Button onClick={() => setPrivacyModal(false)}>Understood</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={termsModal} onOpenChange={setTermsModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Terms of Service
            </DialogTitle>
            <DialogDescription>
              Municipal Environment and Natural Resources Office (MENRO)
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground space-y-3 pt-2 leading-relaxed">
            <div>
              <p className="font-semibold text-foreground mb-1">1. Community Reporting Guidelines</p>
              <p>Reports submitted must be truthful and accurate. Submitting knowingly false reports or abusive content may result in account suspension under local ordinances.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">2. Waste Segregation Compliance</p>
              <p>Residents are encouraged to adhere to Republic Act 9003 (Ecological Solid Waste Management Act) by separating biodegradable and non-biodegradable waste according to barangay schedules.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">3. Service Availability</p>
              <p>Truck tracking and schedules are subject to weather, mechanical conditions, and road access in Candelaria.</p>
            </div>
          </div>
          <div className="flex justify-end pt-3">
            <Button onClick={() => setTermsModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ Modal */}
      <Dialog open={faqModal} onOpenChange={setFaqModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
            </DialogTitle>
            <DialogDescription>Common questions about waste collection in Candelaria</DialogDescription>
          </DialogHeader>
          <div className="text-xs space-y-3 pt-2">
            <div className="rounded-lg border border-border p-3">
              <p className="font-semibold text-foreground mb-1">What time does the garbage truck arrive?</p>
              <p className="text-muted-foreground">Trucks typically begin routes at 6:00 AM on scheduled collection days. You can track your truck in real time on the Truck Tracking page.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-semibold text-foreground mb-1">Who can see my reported waste complaints?</p>
              <p className="text-muted-foreground">Your report details and contact info are only visible to authorized MENRO municipal officers for dispatch and verification. They are never shared publicly.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-semibold text-foreground mb-1">What if my garbage was missed?</p>
              <p className="text-muted-foreground">You can file a "Missed Collection" violation report under the Submit Report module so MENRO can dispatch a follow-up.</p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setFaqModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact MENRO Modal */}
      <Dialog open={contactModal} onOpenChange={setContactModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Contact MENRO
            </DialogTitle>
            <DialogDescription>Municipal Environment and Natural Resources Office</DialogDescription>
          </DialogHeader>
          <div className="text-xs space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="font-medium text-foreground">Office Address</p>
                <p className="text-muted-foreground">Municipal Hall, Candelaria, Quezon, Philippines</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="font-medium text-foreground">Office Hours</p>
                <p className="text-muted-foreground">Monday – Friday: 8:00 AM – 5:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="font-medium text-foreground">Hotline / Telephone</p>
                <p className="text-muted-foreground">(042) 585-4111 / menro@candelaria.gov.ph</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setContactModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bug Report Modal */}
      <Dialog open={bugModal} onOpenChange={setBugModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Bug className="w-5 h-5 text-primary" /> Report an App Bug
            </DialogTitle>
            <DialogDescription>Describe the issue you encountered. Our technical team will look into it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              className="w-full rounded-lg border border-border bg-background p-3 text-xs min-h-[110px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the bug or what happened..."
              value={bugText}
              onChange={(e) => setBugText(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBugModal(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!bugText.trim()) {
                  toast.error("Please enter a description");
                  return;
                }
                setBugModal(false);
                setBugText("");
                toast.success("Bug report submitted. Thank you!");
              }}>Submit Report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentSettings;
