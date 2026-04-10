import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Edit3, Mail, Phone, Lock, User, Shield, Award, Calendar, Clock,
  Heart, FileText, Trash2, LogOut, ChevronRight, Check,
  AlertTriangle, ClipboardList, CheckCircle2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileSkeleton } from "@/components/PageLoadingSkeletons";
import useAuthStore from "@/store/authStore";

/* ─── Mock Data ─── */
const profileData = {
  name: "Juan dela Cruz",
  username: "juandc",
  email: "juan.delacruz@email.com",
  phone: "+63 912 345 6789",
  barangay: "Malabanban Norte",
  joinDate: "January 15, 2026",
  avatar: "JD",
};

const activitySummary = {
  reportsSubmitted: 12,
  reportsResolved: 8,
  likesGiven: 24,
  memberSince: "January 15, 2026",
};

const recentReports = [
  { id: "1042", type: "Illegal Dumping", barangay: "Malabanban Norte", date: "March 28, 2026", status: "Resolved" },
  { id: "1038", type: "Clogged Drainage", barangay: "Malabanban Norte", date: "March 22, 2026", status: "Under Review" },
  { id: "1035", type: "Overflowing Bin", barangay: "Malabanban Norte", date: "March 18, 2026", status: "In Progress" },
];

const collectionSchedule = [
  { day: "Monday", type: "Biodegradable", time: "8:00 AM" },
  { day: "Wednesday", type: "Recyclable", time: "8:00 AM" },
  { day: "Friday", type: "Residual", time: "9:00 AM" },
];

const badges = [
  { label: "First Report", icon: FileText, earned: true },
  { label: "5 Reports Resolved", icon: CheckCircle2, earned: true },
  { label: "Active Resident", icon: Award, earned: true },
  { label: "Community Helper", icon: Heart, earned: false },
];

const statusColors: Record<string, string> = {
  Resolved: "bg-leaf/15 text-foreground",
  "Under Review": "bg-earth text-earth-dark",
  "In Progress": "bg-primary/10 text-primary",
};

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
const ResidentProfile = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; field: string; value: string }>({ open: false, field: "", value: "" });
  const [deleteModal, setDeleteModal] = useState(false);

  const openEdit = (field: string, value: string) => setEditModal({ open: true, field, value });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <ProfileSkeleton />
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
            <p className="text-sm text-muted-foreground mt-0.5">{profileData.barangay}</p>
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
      <Section title="Activity Summary" icon={ClipboardList}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Reports Submitted", value: activitySummary.reportsSubmitted, icon: FileText },
            { label: "Reports Resolved", value: activitySummary.reportsResolved, icon: CheckCircle2 },
            { label: "Likes Given", value: activitySummary.likesGiven, icon: Heart },
            { label: "Member Since", value: "Jan 2026", icon: Calendar },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/50 p-3.5 text-center space-y-1">
              <item.icon className="w-4 h-4 text-primary mx-auto" />
              <p className="text-lg font-display font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── My Reports ── */}
      <Section title="My Reports" icon={FileText}>
        <div className="space-y-1">
          {recentReports.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.type}</p>
                <p className="text-xs text-muted-foreground">{r.barangay} · {r.date}</p>
              </div>
              <Badge variant="secondary" className={`text-[10px] font-semibold ${statusColors[r.status] || ""}`}>
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/resident/my-reports")}>
          View All Reports <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Section>

      {/* ── Collection Schedule ── */}
      <Section title="My Collection Schedule" icon={Calendar}>
        <div className="space-y-1">
          {collectionSchedule.map((s) => (
            <div key={s.day} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.day}</p>
                  <p className="text-xs text-muted-foreground">{s.type}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{s.time}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Badges & Recognition ── */}
      <Section title="Badges & Recognition" icon={Award}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={b.label}
              className={`rounded-lg p-4 text-center space-y-2 transition-colors ${
                b.earned ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-border opacity-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${
                b.earned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <b.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-foreground">{b.label}</p>
              {b.earned && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-primary font-semibold">
                  <Check className="w-3 h-3" /> Earned
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Actions ── */}
      <div className="space-y-3 pb-8">
        <button
          onClick={() => { void handleLogout(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            bg-destructive/5 text-destructive border border-destructive/15
            hover:bg-destructive/10 hover:border-destructive/25 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/15 transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block font-semibold">Log Out</span>
            <span className="block text-[10px] text-destructive/70 font-normal">Sign out of your account</span>
          </div>
        </button>
        <button
          onClick={() => setDeleteModal(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            text-muted-foreground border border-border bg-card
            hover:text-destructive hover:border-destructive/20 hover:bg-destructive/[0.03] transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block font-semibold">Request Account Deletion</span>
            <span className="block text-[10px] text-muted-foreground/70 font-normal">Permanently remove your account and data</span>
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
            <DialogTitle className="font-display">Edit {editModal.field}</DialogTitle>
            <DialogDescription>Update your {editModal.field.toLowerCase()} below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{editModal.field}</Label>
              <Input
                type={editModal.field === "Password" ? "password" : "text"}
                defaultValue={editModal.value}
                placeholder={editModal.field === "Password" ? "Enter new password" : `Enter ${editModal.field.toLowerCase()}`}
              />
              {editModal.field === "Password" && (
                <Input type="password" placeholder="Confirm new password" className="mt-2" />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}>Cancel</Button>
              <Button onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Modal ── */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Request Account Deletion</DialogTitle>
            <DialogDescription>
              This will submit a request to delete your account and all associated data. This action cannot be undone. Your request will be processed in accordance with the Philippine Data Privacy Act.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setDeleteModal(false)}>Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentProfile;
