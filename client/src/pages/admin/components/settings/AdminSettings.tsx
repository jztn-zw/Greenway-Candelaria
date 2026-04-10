import { useState, useEffect } from "react";
import {
  Building2, Sun, Moon, Globe, Wrench, Shield, Smartphone, Truck,
  UserPlus, Lock, Clock, AlertTriangle, MessageSquare, FileText,
  MapPin, Mail, Phone, Image, Calendar, Radio
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminSettingsSkeleton, PageHeaderSkeleton } from "@/components/PageLoadingSkeletons";

/* ─── Section Wrapper ─── */
const Section = ({
  title, icon: Icon, children, superAdminOnly = false, isSuperAdmin = true,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  superAdminOnly?: boolean; isSuperAdmin?: boolean;
}) => (
  <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 relative">
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h2>
      {superAdminOnly && (
        <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 gap-1">
          <Lock className="w-2.5 h-2.5" /> Super Admin
        </Badge>
      )}
    </div>
    {superAdminOnly && !isSuperAdmin && (
      <div className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10">
        <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
          <Lock className="w-4 h-4" /> Super Admin access required
        </p>
      </div>
    )}
    <div className={superAdminOnly && !isSuperAdmin ? "opacity-40 pointer-events-none select-none" : ""}>
      {children}
    </div>
  </section>
);

/* ─── Toggle Row ─── */
const ToggleRow = ({
  label, description, icon: Icon, checked, onCheckedChange,
}: {
  label: string; description?: string; icon: React.ElementType;
  checked: boolean; onCheckedChange: (v: boolean) => void;
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
const AdminSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const isSuperAdmin = true; // Mock — would come from auth context

  // Organization Details
  const [org, setOrg] = useState({
    name: "MENRO Candelaria",
    address: "Municipal Hall, Candelaria, Quezon",
    email: "menro@candelaria.gov.ph",
    phone: "+63 42 585 1234",
  });

  // Appearance
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Language
  const [language, setLanguage] = useState<"en" | "fil">("en");

  // System Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  // Security Policy
  const [sessionTimeout, setSessionTimeout] = useState("30m");
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [maxFailedLogins, setMaxFailedLogins] = useState("5");

  // Resident App Controls
  const [allowReports, setAllowReports] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [defaultReminder, setDefaultReminder] = useState("3h");

  // Driver App Controls
  const [driverMessages, setDriverMessages] = useState(true);
  const [gpsFrequency, setGpsFrequency] = useState("4s");

  // Account Registration
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <AdminSettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">System-wide configuration for the GreenWay Admin Portal</p>
      </div>

      {/* ── Section 1: Organization Details ── */}
      <Section title="Organization Details" icon={Building2} superAdminOnly isSuperAdmin={isSuperAdmin}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Organization Name</Label>
              <Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Contact Email</Label>
              <Input value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Contact Phone</Label>
              <Input value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Official Address</Label>
              <Input value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Organization Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Image className="w-3.5 h-3.5" /> Upload Logo
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Section 2: Appearance ── */}
      <Section title="Appearance" icon={Sun}>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {dark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-[11px] text-muted-foreground">Toggle dark mode for your admin panel view</p>
            </div>
          </div>
          <Switch checked={dark} onCheckedChange={toggleTheme} />
        </div>
      </Section>

      {/* ── Section 3: Language Preference ── */}
      <Section title="Language Preference" icon={Globe}>
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">Set the default language for the admin panel interface</p>
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

      {/* ── Section 4: System Maintenance ── */}
      <Section title="System Maintenance" icon={Wrench} superAdminOnly isSuperAdmin={isSuperAdmin}>
        <div className="space-y-5">
          <ToggleRow
            label="Maintenance Mode"
            description="When enabled, the resident app and public landing page show a maintenance message"
            icon={AlertTriangle}
            checked={maintenanceMode}
            onCheckedChange={setMaintenanceMode}
          />

          <div className="rounded-lg bg-muted/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Scheduled Maintenance Window</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Start Date & Time</Label>
                <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">End Date & Time</Label>
                <Input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
              </div>
            </div>
            {scheduledStart && scheduledEnd && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Next scheduled: {new Date(scheduledStart).toLocaleString()} — {new Date(scheduledEnd).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Section 5: Security Policy ── */}
      <Section title="Security Policy" icon={Shield} superAdminOnly isSuperAdmin={isSuperAdmin}>
        <div className="space-y-5">
          <div className="flex items-center justify-between py-3 border-b border-border gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Session Timeout</p>
                <p className="text-[11px] text-muted-foreground">Auto-logout after inactivity</p>
              </div>
            </div>
            <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ToggleRow
            label="Enforce Two-Factor Authentication"
            description="Require all admins to use 2FA on every login"
            icon={Shield}
            checked={enforce2FA}
            onCheckedChange={setEnforce2FA}
          />

          <div className="flex items-center justify-between py-3 border-b border-border gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Max Failed Login Attempts</p>
                <p className="text-[11px] text-muted-foreground">Lock account after exceeding limit</p>
              </div>
            </div>
            <Select value={maxFailedLogins} onValueChange={setMaxFailedLogins}>
              <SelectTrigger className="w-24 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* ── Section 6: Resident App Controls ── */}
      <Section title="Resident App Controls" icon={Smartphone} superAdminOnly isSuperAdmin={isSuperAdmin}>
        <div className="space-y-1">
          <ToggleRow
            label="Allow Report Submissions"
            description="Residents can submit waste reports through the app"
            icon={FileText}
            checked={allowReports}
            onCheckedChange={setAllowReports}
          />
          <ToggleRow
            label="Allow Comments on Posts"
            description="Residents can comment on published content"
            icon={MessageSquare}
            checked={allowComments}
            onCheckedChange={setAllowComments}
          />
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Default Collection Reminder</p>
                <p className="text-[11px] text-muted-foreground">System default — residents can override individually</p>
              </div>
            </div>
            <Select value={defaultReminder} onValueChange={setDefaultReminder}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour before</SelectItem>
                <SelectItem value="3h">3 hours before</SelectItem>
                <SelectItem value="1d">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* ── Section 7: Driver App Controls ── */}
      <Section title="Driver App Controls" icon={Truck} superAdminOnly isSuperAdmin={isSuperAdmin}>
        <div className="space-y-1">
          <ToggleRow
            label="Driver Status Messages"
            description="Allow drivers to send status messages to residents"
            icon={MessageSquare}
            checked={driverMessages}
            onCheckedChange={setDriverMessages}
          />
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">GPS Update Frequency</p>
                <p className="text-[11px] text-muted-foreground">How often the driver app sends location pings</p>
              </div>
            </div>
            <Select value={gpsFrequency} onValueChange={setGpsFrequency}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4s">Every 4 seconds</SelectItem>
                <SelectItem value="10s">Every 10 seconds</SelectItem>
                <SelectItem value="30s">Every 30 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* ── Section 8: Account Registration ── */}
      <Section title="Account Registration" icon={UserPlus} superAdminOnly isSuperAdmin={isSuperAdmin}>
        <div className="space-y-4">
          <ToggleRow
            label="Open Resident Registration"
            description="When closed, new residents cannot create accounts. Existing accounts are unaffected."
            icon={UserPlus}
            checked={registrationOpen}
            onCheckedChange={setRegistrationOpen}
          />
          {!registrationOpen && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>New resident registration is currently closed. Only existing residents can access the app.</span>
            </div>
          )}
          
        </div>
      </Section>

      <div className="h-8" />
    </div>
  );
};

export default AdminSettings;
