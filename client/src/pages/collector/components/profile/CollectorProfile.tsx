import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, User, Mail, Phone, Lock, Shield, Calendar, LogOut,
  Monitor, Smartphone, Route, CheckCircle2, Flame, Clock,
  Sun, Moon, Globe
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import useAuthStore from "@/store/authStore";

const ProfileSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 4 }).map((_, j) => (
          <div key={j} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* ─── Mock Data ─── */
const profileData = {
  name: "Juan Dela Cruz",
  username: "jdelacruz",
  email: "juan.delacruz@menro.gov.ph",
  phone: "+63 917 123 4567",
  role: "Collector",
  office: "MENRO Candelaria",
  truck: "Truck A",
  plate: "GHW 1234",
  joinDate: "June 2024",
  avatar: "JD",
};

const activityStats = [
  { label: "Routes Completed", value: 218, icon: Route },
  { label: "Days Active This Month", value: 14, icon: Flame },
  { label: "Avg Completion Rate", value: "94%", icon: CheckCircle2 },
  { label: "Member Since", value: "Jun 2024", icon: Clock },
];

const sessions = [
  { id: "1", device: "Chrome on Android", icon: Smartphone, location: "Candelaria, Quezon", lastActive: "Active now", current: true },
  { id: "2", device: "Safari on iPhone", icon: Smartphone, location: "Lucena City", lastActive: "3 hours ago", current: false },
  { id: "3", device: "Chrome on Windows", icon: Monitor, location: "Candelaria, Quezon", lastActive: "Yesterday", current: false },
];

/* ─── Section Wrapper ─── */
const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" /> {title}
    </h2>
    {children}
  </section>
);

/* ─── Editable Field Row ─── */
const FieldRow = ({
  label, value, icon: Icon, masked, onEdit,
}: {
  label: string; value: string; icon: React.ElementType; masked?: boolean; onEdit: () => void;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm text-foreground truncate">{masked ? "••••••••" : value}</p>
      </div>
    </div>
    <button onClick={onEdit} className="text-xs text-primary hover:underline font-medium shrink-0 ml-3">
      {masked ? "Change" : "Edit"}
    </button>
  </div>
);

/* ─── Main Component ─── */
const CollectorProfile = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [editModal, setEditModal] = useState<{ open: boolean; field: string; value: string }>({ open: false, field: "", value: "" });
  const [logoutModal, setLogoutModal] = useState(false);
  const [logoutAllModal, setLogoutAllModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [language, setLanguage] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    setLogoutModal(false);
    await logout();
    navigate("/", { replace: true });
  };

  const toggleTheme = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", checked ? "dark" : "light");
  };

  const openEdit = (field: string, value: string) => setEditModal({ open: true, field, value });

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Profile Header ── */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display font-bold">
                {profileData.avatar}
              </AvatarFallback>
            </Avatar>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-accent transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">{profileData.name}</h1>
            <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                {profileData.role} · {profileData.office}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 justify-center sm:justify-start flex items-center gap-1">
              {profileData.truck} · {profileData.plate}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-start">
              <Calendar className="w-3 h-3" /> Joined {profileData.joinDate}
            </p>
          </div>
        </div>
      </div>

      {/* ── Personal Information ── */}
      <Section title="Personal Information" icon={User}>
        <div>
          <FieldRow label="Full Name" value={profileData.name} icon={User} onEdit={() => openEdit("Full Name", profileData.name)} />
          <FieldRow label="Username" value={profileData.username} icon={User} onEdit={() => openEdit("Username", profileData.username)} />
          <FieldRow label="Email Address" value={profileData.email} icon={Mail} onEdit={() => openEdit("Email Address", profileData.email)} />
          <FieldRow label="Phone Number" value={profileData.phone} icon={Phone} onEdit={() => openEdit("Phone Number", profileData.phone)} />
          <FieldRow label="Password" value="" icon={Lock} masked onEdit={() => openEdit("Password", "")} />
        </div>
      </Section>

      {/* ── Activity Summary ── */}
      <Section title="Activity Summary" icon={Route}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {activityStats.map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/50 p-3.5 text-center space-y-1">
              <item.icon className="w-4 h-4 text-primary mx-auto" />
              <p className="text-lg font-display font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" icon={Sun}>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Dark Mode</p>
              <p className="text-[11px] text-muted-foreground">Toggle dark mode for your panel view</p>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleTheme} />
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
                onClick={() => setLanguage(lang === "en" ? false : true)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  (lang === "en" && !language) || (lang === "fil" && language)
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

      {/* ── Security: Active Sessions ── */}
      <Section title="Active Sessions" icon={Monitor}>
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
              {!s.current && (
                <button className="text-xs text-destructive hover:underline font-medium shrink-0 ml-3">
                  Log Out
                </button>
              )}
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
      </Section>

      {/* ── Two-Factor Authentication ── */}
      <Section title="Two-Factor Authentication" icon={Shield}>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Enable Two-Factor Authentication</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </div>
      </Section>

      {/* ── Log Out ── */}
      <div className="space-y-3 pb-4">
        <button
          onClick={() => setLogoutModal(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            bg-destructive/5 text-destructive border border-destructive/15
            hover:bg-destructive/10 hover:border-destructive/25 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/15 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block font-semibold">Log Out</span>
            <span className="block text-[10px] text-destructive/70 font-normal">Sign out of your current session</span>
          </div>
        </button>
        <p className="text-[10px] text-muted-foreground text-center">
          In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)
        </p>
      </div>

      {/* ── Edit Field Modal ── */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editModal.field === "Password" ? "Change Password" : `Edit ${editModal.field}`}</DialogTitle>
            <DialogDescription>
              {editModal.field === "Password"
                ? "Enter your current password and a new password below."
                : `Update your ${editModal.field.toLowerCase()} below.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editModal.field === "Password" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <Input type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input type="password" placeholder="Confirm new password" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{editModal.field}</Label>
                <Input defaultValue={editModal.value} placeholder={`Enter ${editModal.field.toLowerCase()}`} />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}>Cancel</Button>
              <Button onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Logout Confirmation ── */}
      <Dialog open={logoutModal} onOpenChange={setLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Log Out</DialogTitle>
            <DialogDescription>Are you sure you want to log out of your current session?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setLogoutModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { void handleLogout(); }}>Log Out</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Logout All Modal ── */}
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
    </div>
  );
};

export default CollectorProfile;
