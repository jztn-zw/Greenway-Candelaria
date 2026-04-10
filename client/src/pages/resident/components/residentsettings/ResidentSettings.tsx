import { useState, useEffect } from "react";
import {
  Bell, Calendar, Shield, Lock, Download, HelpCircle, ExternalLink, Bug,
  Mail, Smartphone, Monitor, Laptop, Globe, Clock, Eye, EyeOff, ChevronRight,
  MessageSquare, FileText, AlertTriangle, Megaphone, Truck, Sun, Moon, MapPin
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SettingsSkeleton, PageHeaderSkeleton } from "@/components/PageLoadingSkeletons";

/* ─── Section Wrapper ─── */
const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" /> {title}
    </h2>
    {children}
  </section>
);

/* ─── Toggle Row ─── */
const ToggleRow = ({
  label, description, icon: Icon, checked, onCheckedChange, deliveryMethod, onDeliveryChange,
}: {
  label: string; description?: string; icon: React.ElementType; checked: boolean; onCheckedChange: (v: boolean) => void;
  deliveryMethod?: string; onDeliveryChange?: (v: string) => void;
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
    <div className="flex items-center gap-3 shrink-0">
      {deliveryMethod !== undefined && onDeliveryChange && checked && (
        <Select value={deliveryMethod} onValueChange={onDeliveryChange}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in-app">In-app</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  </div>
);

/* ─── Mock sessions ─── */
const sessions = [
  { id: "1", device: "Chrome on Windows", icon: Monitor, location: "Candelaria, Quezon", lastActive: "Active now", current: true },
  { id: "2", device: "Safari on iPhone", icon: Smartphone, location: "Lucena City", lastActive: "2 hours ago", current: false },
  { id: "3", device: "Firefox on MacBook", icon: Laptop, location: "Manila", lastActive: "Yesterday", current: false },
];

/* ─── Main Component ─── */
const ResidentSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [notifs, setNotifs] = useState({
    collectionReminders: { on: true, method: "in-app" },
    truckNear: { on: true, method: "push" },
    reportUpdates: { on: true, method: "in-app" },
    newContent: { on: false, method: "in-app" },
    announcements: { on: true, method: "email" },
  });

  const [collectionPrefs, setCollectionPrefs] = useState({
    barangay: "Malabanban Norte",
    reminderOn: true,
    reminderTiming: "3h",
  });

  const [privacy, setPrivacy] = useState({
    anonymousReporting: false,
    profileVisible: true,
  });

  const [twoFactor, setTwoFactor] = useState(false);
  const [logoutAllModal, setLogoutAllModal] = useState(false);
  const [downloadModal, setDownloadModal] = useState(false);
  const [bugModal, setBugModal] = useState(false);

  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [language, setLanguage] = useState<"en" | "fil">("en");

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const updateNotif = (key: keyof typeof notifs, field: "on" | "method", value: boolean | string) => {
    setNotifs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences and account settings</p>
      </div>

      {/* ── Notifications ── */}
      <Section title="Notifications" icon={Bell}>
        <div>
          <ToggleRow
            label="Collection Reminders" icon={Calendar} description="Get reminded before collection day"
            checked={notifs.collectionReminders.on} onCheckedChange={(v) => updateNotif("collectionReminders", "on", v)}
            deliveryMethod={notifs.collectionReminders.method} onDeliveryChange={(v) => updateNotif("collectionReminders", "method", v)}
          />
          <ToggleRow
            label="Truck Is Near" icon={Truck} description="Alert when truck approaches your area"
            checked={notifs.truckNear.on} onCheckedChange={(v) => updateNotif("truckNear", "on", v)}
            deliveryMethod={notifs.truckNear.method} onDeliveryChange={(v) => updateNotif("truckNear", "method", v)}
          />
          <ToggleRow
            label="Report Updates" icon={FileText} description="Updates on your submitted reports"
            checked={notifs.reportUpdates.on} onCheckedChange={(v) => updateNotif("reportUpdates", "on", v)}
            deliveryMethod={notifs.reportUpdates.method} onDeliveryChange={(v) => updateNotif("reportUpdates", "method", v)}
          />
          <ToggleRow
            label="New Content Posted" icon={MessageSquare} description="When new posts are published"
            checked={notifs.newContent.on} onCheckedChange={(v) => updateNotif("newContent", "on", v)}
            deliveryMethod={notifs.newContent.method} onDeliveryChange={(v) => updateNotif("newContent", "method", v)}
          />
          <ToggleRow
            label="System Announcements" icon={Megaphone} description="Important MENRO announcements"
            checked={notifs.announcements.on} onCheckedChange={(v) => updateNotif("announcements", "on", v)}
            deliveryMethod={notifs.announcements.method} onDeliveryChange={(v) => updateNotif("announcements", "method", v)}
          />
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" icon={Sun}>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {dark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-[11px] text-muted-foreground">Toggle dark mode for your panel view</p>
            </div>
          </div>
          <Switch checked={dark} onCheckedChange={toggleTheme} />
        </div>
      </Section>

      {/* ── Language Preference ── */}
      <Section title="Language Preference" icon={Globe}>
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">Set the default language for the interface</p>
          <div className="flex gap-3">
            {(["en", "fil"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  language === lang
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {lang === "en" ? "English" : "Filipino"}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Collection Preferences ── */}
      <Section title="Collection Preferences" icon={Calendar}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Primary Barangay</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Used for schedule and truck tracking</p>
              </div>
            </div>
            <Select value={collectionPrefs.barangay} onValueChange={(v) => setCollectionPrefs((p) => ({ ...p, barangay: v }))}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Malabanban Norte">Malabanban Norte</SelectItem>
                <SelectItem value="Malabanban Sur">Malabanban Sur</SelectItem>
                <SelectItem value="Poblacion">Poblacion</SelectItem>
                <SelectItem value="Bukal Norte">Bukal Norte</SelectItem>
                <SelectItem value="Bukal Sur">Bukal Sur</SelectItem>
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
                <p className="text-[11px] text-muted-foreground mt-0.5">Get notified before collection day</p>
              </div>
            </div>
            <Switch checked={collectionPrefs.reminderOn} onCheckedChange={(v) => setCollectionPrefs((p) => ({ ...p, reminderOn: v }))} />
          </div>

          {collectionPrefs.reminderOn && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Remind Me</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">How early before collection</p>
                </div>
              </div>
              <Select value={collectionPrefs.reminderTiming} onValueChange={(v) => setCollectionPrefs((p) => ({ ...p, reminderTiming: v }))}>
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

      {/* ── Privacy ── */}
      <Section title="Privacy" icon={EyeOff}>
        <div>
          <ToggleRow
            label="Anonymous Reporting" icon={Shield} description="Submit reports anonymously by default"
            checked={privacy.anonymousReporting} onCheckedChange={(v) => setPrivacy((p) => ({ ...p, anonymousReporting: v }))}
          />
          <ToggleRow
            label="Profile Visibility" icon={privacy.profileVisible ? Eye : EyeOff}
            description={privacy.profileVisible ? "Your profile is visible to other residents" : "Your profile is hidden from other residents"}
            checked={privacy.profileVisible} onCheckedChange={(v) => setPrivacy((p) => ({ ...p, profileVisible: v }))}
          />
        </div>
      </Section>

      {/* ── Security ── */}
      <Section title="Security" icon={Lock}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Sessions</p>
            <div className="space-y-1">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{s.device}</p>
                        {s.current && <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">Current</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{s.location} · {s.lastActive}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                bg-destructive/5 text-destructive border border-destructive/15
                hover:bg-destructive/10 hover:border-destructive/25 transition-all duration-200"
              onClick={() => setLogoutAllModal(true)}
            >
              Log Out of All Devices
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <ToggleRow
              label="Two-Factor Authentication" icon={Shield} description="Add an extra layer of security to your account"
              checked={twoFactor} onCheckedChange={setTwoFactor}
            />
          </div>
        </div>
      </Section>

      {/* ── Data & Privacy ── */}
      <Section title="Data & Privacy" icon={Download}>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Download My Data</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDownloadModal(true)}>
              Request Download
            </Button>
          </div>
          <a href="#" className="flex items-center justify-between py-3 border-b border-border hover:bg-muted/30 rounded-md px-1 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Privacy Policy</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
          <a href="#" className="flex items-center justify-between py-3 hover:bg-muted/30 rounded-md px-1 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Terms of Service</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </div>
      </Section>

      {/* ── Help & Support ── */}
      <Section title="Help & Support" icon={HelpCircle}>
        <div className="space-y-1 pb-2">
          <a href="#" className="flex items-center justify-between py-3 border-b border-border hover:bg-muted/30 rounded-md px-1 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">FAQ</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
          <a href="#" className="flex items-center justify-between py-3 border-b border-border hover:bg-muted/30 rounded-md px-1 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Contact MENRO</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
          <button onClick={() => setBugModal(true)} className="flex items-center justify-between py-3 w-full text-left hover:bg-muted/30 rounded-md px-1 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Bug className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Report a Bug</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </Section>

      <div className="h-8" />

      {/* ── Modals ── */}
      <Dialog open={logoutAllModal} onOpenChange={setLogoutAllModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Log Out of All Devices</DialogTitle>
            <DialogDescription>This will end all active sessions except your current one. You will need to log in again on other devices.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setLogoutAllModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setLogoutAllModal(false)}>Log Out All</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={downloadModal} onOpenChange={setDownloadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Download Your Data</DialogTitle>
            <DialogDescription>We will prepare a copy of your account data including your profile, reports, and activity history. You will receive a notification when it's ready.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDownloadModal(false)}>Cancel</Button>
            <Button onClick={() => setDownloadModal(false)}>Request Download</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bugModal} onOpenChange={setBugModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Report a Bug</DialogTitle>
            <DialogDescription>Describe the issue you encountered. Our team will look into it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              className="w-full rounded-lg border border-border bg-background p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the bug or issue..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBugModal(false)}>Cancel</Button>
              <Button onClick={() => setBugModal(false)}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentSettings;
