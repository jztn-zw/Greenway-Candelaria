import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, User, Mail, Phone, Lock, Shield, Bell, Calendar, LogOut,
  Monitor, Smartphone, Laptop, ClipboardList, FileText, Megaphone,
  CheckCircle2, AlertTriangle, Truck, Users, Route
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminProfileSkeleton } from "@/components/PageLoadingSkeletons";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import useAuthStore from "@/store/authStore";

/* ─── Mock Data ─── */
const profileData = {
  name: "Maria Santos",
  username: "msantos",
  email: "maria.santos@menro.gov.ph",
  phone: "+63 912 876 5432",
  role: "Administrator",
  joinDate: "March 2024",
  avatar: "MS",
};

const activityStats = [
  { label: "Total Actions This Month", value: 142, icon: ClipboardList },
  { label: "Posts Published", value: 18, icon: FileText },
  { label: "Announcements Sent", value: 7, icon: Megaphone },
  { label: "Reports Resolved", value: 34, icon: CheckCircle2 },
];

const notifPreferences = [
  { key: "newReport", label: "New Report Submitted", description: "When a resident submits a new waste report", icon: FileText },
  { key: "driverStatus", label: "Driver Status Message", description: "When a driver sends a status message", icon: Truck },
  { key: "newResident", label: "New Resident Registered", description: "When a new resident creates an account", icon: Users },
  { key: "failedLogin", label: "Failed Login Detected", description: "When a failed login attempt is recorded", icon: AlertTriangle },
  { key: "missingRoute", label: "Route Has No Truck Assigned", description: "When a collection day has no assigned route", icon: Route },
];

const sessions = [
  { id: "1", device: "Chrome on Windows", icon: Monitor, location: "Candelaria, Quezon", lastActive: "Active now", current: true },
  { id: "2", device: "Safari on iPhone", icon: Smartphone, location: "Lucena City", lastActive: "2 hours ago", current: false },
  { id: "3", device: "Firefox on MacBook", icon: Laptop, location: "Manila", lastActive: "Yesterday", current: false },
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
const AdminProfile = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; field: string; value: string }>({ open: false, field: "", value: "" });
  const [logoutModal, setLogoutModal] = useState(false);
  const [logoutAllModal, setLogoutAllModal] = useState(false);

  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>({
    newReport: true,
    driverStatus: true,
    newResident: true,
    failedLogin: true,
    missingRoute: false,
  });

  const [twoFactor, setTwoFactor] = useState(false);
  const enforce2FASystemWide = false; // Would come from settings context

  const openEdit = (field: string, value: string) => setEditModal({ open: true, field, value });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    setLogoutModal(false);
    await logout();
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <AdminProfileSkeleton />
      </div>
    );
  }

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
                {profileData.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 justify-center sm:justify-start">
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
      <Section title="Activity Summary" icon={ClipboardList}>
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

      {/* ── Notification Preferences ── */}
      <Section title="Notification Preferences" icon={Bell}>
        <div>
          {notifPreferences.map((n) => (
            <div key={n.key} className="flex items-center justify-between py-3 border-b border-border last:border-b-0 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <n.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium">{n.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.description}</p>
                </div>
              </div>
              <Switch
                checked={notifToggles[n.key]}
                onCheckedChange={(v) => setNotifToggles((prev) => ({ ...prev, [n.key]: v }))}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Active Sessions ── */}
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
                {enforce2FASystemWide
                  ? "Two-Factor Authentication is required by your system administrator"
                  : "Add an extra layer of security to your account"
                }
              </p>
            </div>
          </div>
          <Switch
            checked={enforce2FASystemWide ? true : twoFactor}
            onCheckedChange={enforce2FASystemWide ? undefined : setTwoFactor}
            disabled={enforce2FASystemWide}
          />
        </div>
        {enforce2FASystemWide && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5" />
            <span>This setting is enforced system-wide and cannot be changed individually.</span>
          </div>
        )}
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
      <LogoutConfirmModal
        open={logoutModal}
        onOpenChange={setLogoutModal}
        onConfirm={() => {
          void handleLogout();
        }}
        title="Log Out of GreenWay?"
        description="Are you sure you want to log out of your current administrative session?"
      />

      {/* ── Logout All Modal ── */}
      <LogoutConfirmModal
        open={logoutAllModal}
        onOpenChange={setLogoutAllModal}
        onConfirm={() => setLogoutAllModal(false)}
        title="Log Out of All Devices?"
        description="This will terminate all active sessions across all devices except this current browser."
        confirmLabel="Log Out All"
      />
    </div>
  );
};

export default AdminProfile;
