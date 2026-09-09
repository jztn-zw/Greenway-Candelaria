import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, User, Mail, Phone, Lock, Shield, Calendar, LogOut,
  Route, CheckCircle2, Truck, AlertTriangle, Eye, EyeOff, Loader2,
  Headphones, Building2, AlertCircle, Wrench
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import useAuthStore from "@/store/authStore";
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  UserProfile,
} from "@/services/profileService";
import {
  fetchDriverMe,
  DriverMeData,
  updateMyDriverStatus,
} from "@/services/driverManagerService";
import { toast } from "@/lib/toast";

const ProfileSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6 pb-8 animate-in fade-in duration-300">
    {/* Identity Card */}
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-52" />
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 flex-wrap">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
      </div>
    </div>

    {/* Assigned Truck & Equipment Card */}
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>

    {/* Personal Information */}
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-36" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>

    {/* Account Security */}
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
    </div>

    {/* MENRO Support */}
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Section Wrapper ─── */
const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
    <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-primary" /> {title}
    </h2>
    {children}
  </section>
);

/* ─── Editable Field Row ─── */
const FieldRow = ({
  label, value, icon: Icon, masked, onEdit,
}: {
  label: string; value: string; icon: React.ElementType; masked?: boolean; onEdit?: () => void;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border/60 last:border-b-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{masked ? "••••••••" : (value || "—")}</p>
      </div>
    </div>
    {onEdit && (
      <button onClick={onEdit} className="text-xs text-primary hover:underline font-semibold shrink-0 ml-3 cursor-pointer">
        {masked ? "Change" : "Edit"}
      </button>
    )}
  </div>
);

const CollectorProfile = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driverData, setDriverData] = useState<DriverMeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editModal, setEditModal] = useState<{
    open: boolean; field: string; value: string; saving: boolean; error: string;
  }>({ open: false, field: "", value: "", saving: false, error: "" });

  // Password modal
  const [pwModal, setPwModal] = useState<{
    open: boolean; oldPw: string; newPw: string; confirmPw: string;
    showOld: boolean; showNew: boolean; saving: boolean; error: string;
  }>({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });

  // Truck breakdown report modal
  const [breakdownModal, setBreakdownModal] = useState(false);
  const [breakdownReason, setBreakdownReason] = useState("Flat Tire / Puncture");
  const [breakdownNote, setBreakdownNote] = useState("");
  const [reportingBreakdown, setReportingBreakdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const [prof, drv] = await Promise.all([
          fetchProfile(),
          fetchDriverMe(),
        ]);
        if (isMounted) {
          setProfile(prof);
          setDriverData(drv);
        }
      } catch (err) {
        toast.error("Failed to load driver profile");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const { avatar_url } = await uploadAvatar(file);
      setProfile((prev) => prev ? { ...prev, avatar_url } : null);
      if (authUser) setUser({ ...authUser, avatar_url });
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveField = async () => {
    if (!editModal.value.trim()) {
      setEditModal((m) => ({ ...m, error: "Field cannot be empty" }));
      return;
    }
    try {
      setEditModal((m) => ({ ...m, saving: true, error: "" }));
      const payload: Partial<UserProfile> = { [editModal.field]: editModal.value.trim() };
      const updated = await updateProfile(payload);
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...payload });
      toast.success("Profile updated");
      setEditModal((m) => ({ ...m, open: false, saving: false }));
    } catch (err: any) {
      setEditModal((m) => ({
        ...m,
        saving: false,
        error: err.response?.data?.message || "Update failed",
      }));
    }
  };

  const handleSavePassword = async () => {
    if (!pwModal.oldPw || !pwModal.newPw || !pwModal.confirmPw) {
      setPwModal((m) => ({ ...m, error: "All fields are required" }));
      return;
    }
    if (pwModal.newPw.length < 8) {
      setPwModal((m) => ({ ...m, error: "New password must be at least 8 characters" }));
      return;
    }
    if (pwModal.newPw !== pwModal.confirmPw) {
      setPwModal((m) => ({ ...m, error: "Passwords do not match" }));
      return;
    }
    try {
      setPwModal((m) => ({ ...m, saving: true, error: "" }));
      await changePassword({ old_password: pwModal.oldPw, new_password: pwModal.newPw });
      toast.success("Password changed successfully");
      setPwModal({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });
    } catch (err: any) {
      setPwModal((m) => ({
        ...m,
        saving: false,
        error: err.response?.data?.message || "Failed to update password",
      }));
    }
  };

  const handleReportBreakdown = async () => {
    try {
      setReportingBreakdown(true);
      const msg = `[TRUCK BREAKDOWN] ${breakdownReason}${breakdownNote ? ` - Note: ${breakdownNote}` : ""}`;
      await updateMyDriverStatus(msg);
      toast.success("Truck breakdown reported to MENRO Dispatch");
      setBreakdownModal(false);
      setBreakdownNote("");
    } catch {
      toast.error("Failed to submit truck report");
    } finally {
      setReportingBreakdown(false);
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  const displayName = profile?.full_name || authUser?.full_name || "Juan Dela Cruz";
  const displayEmail = profile?.email || authUser?.email || "juan.delacruz@menro.gov.ph";
  const displayPhone = profile?.phone || "0917 123 4567";
  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-8 animate-in fade-in duration-300">
      {/* ── Top Driver Identity Card ── */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative group">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-2 ring-primary/20 shadow-md">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer"
              title="Change Profile Photo"
            >
              {avatarUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                {displayName}
              </h1>
              <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
                Collector / Driver
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              MENRO Candelaria · Solid Waste Management Division
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Active Account
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {displayEmail}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Assigned Truck & Equipment Card ── */}
      <Section title="Assigned Vehicle & Equipment" icon={Truck}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned Truck</p>
            <p className="text-base font-bold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              {driverData?.truck_name || "Truck A"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Plate: {driverData?.truck_plate || "GHW 1234"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Vehicle Status</p>
            <div className="pt-0.5">
              <Badge className={driverData?.truck_availability === "UNDER_MAINTENANCE"
                ? "bg-destructive/15 text-destructive border-destructive/25 text-xs font-semibold"
                : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-500/20 text-xs font-semibold"
              }>
                {driverData?.truck_availability === "UNDER_MAINTENANCE" ? "Under Maintenance" : "Operational / Ready"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Assigned by MENRO Supervisor
            </p>
          </div>
        </div>

        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBreakdownModal(true)}
            className="w-full text-xs h-9 gap-1.5 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-xl cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            Report Issue with Assigned Truck
          </Button>
        </div>
      </Section>

      {/* ── Contact & Personal Details ── */}
      <Section title="Personal Information" icon={User}>
        <FieldRow
          label="Full Name"
          value={displayName}
          icon={User}
          onEdit={() => setEditModal({ open: true, field: "full_name", value: displayName, saving: false, error: "" })}
        />
        <FieldRow
          label="Phone Number"
          value={displayPhone}
          icon={Phone}
          onEdit={() => setEditModal({ open: true, field: "phone", value: displayPhone, saving: false, error: "" })}
        />
        <FieldRow
          label="Email Address"
          value={displayEmail}
          icon={Mail}
        />
        <FieldRow
          label="Username"
          value={profile?.username || authUser?.username || "—"}
          icon={Shield}
        />
      </Section>

      {/* ── Account Security ── */}
      <Section title="Account Security" icon={Lock}>
        <FieldRow
          label="Password"
          value="••••••••"
          icon={Lock}
          masked
          onEdit={() => setPwModal((m) => ({ ...m, open: true, oldPw: "", newPw: "", confirmPw: "", error: "" }))}
        />
      </Section>

      {/* ── MENRO Dispatch & Emergency Contacts ── */}
      <Section title="MENRO Dispatch & Emergency Support" icon={Headphones}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> MENRO Candelaria Office
            </p>
            <p className="text-muted-foreground">Municipal Hall Compound, Candelaria, Quezon</p>
            <p className="text-primary font-mono font-semibold pt-1">(042) 585-4111</p>
          </div>

          <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Dispatch Emergency Line
            </p>
            <p className="text-muted-foreground">For route assistance & towing</p>
            <p className="text-amber-700 dark:text-amber-400 font-mono font-semibold pt-1">+63 917 123 4567</p>
          </div>
        </div>
      </Section>

      {/* ── Edit Modal ── */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal((m) => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Edit {editModal.field === "full_name" ? "Full Name" : editModal.field}
            </DialogTitle>
            <DialogDescription>Update your collector profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New Value</Label>
              <Input
                value={editModal.value}
                onChange={(e) => setEditModal((m) => ({ ...m, value: e.target.value, error: "" }))}
                placeholder="Enter new value"
                className="rounded-xl"
              />
              {editModal.error && <p className="text-xs text-destructive">{editModal.error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModal((m) => ({ ...m, open: false }))} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveField} disabled={editModal.saving} className="rounded-xl">
                {editModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Password Modal ── */}
      <Dialog open={pwModal.open} onOpenChange={(open) => setPwModal((m) => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and a new secure password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Current Password</Label>
              <div className="relative">
                <Input
                  type={pwModal.showOld ? "text" : "password"}
                  value={pwModal.oldPw}
                  onChange={(e) => setPwModal((m) => ({ ...m, oldPw: e.target.value, error: "" }))}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setPwModal((m) => ({ ...m, showOld: !m.showOld }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {pwModal.showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <div className="relative">
                <Input
                  type={pwModal.showNew ? "text" : "password"}
                  value={pwModal.newPw}
                  onChange={(e) => setPwModal((m) => ({ ...m, newPw: e.target.value, error: "" }))}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setPwModal((m) => ({ ...m, showNew: !m.showNew }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {pwModal.showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={pwModal.confirmPw}
                onChange={(e) => setPwModal((m) => ({ ...m, confirmPw: e.target.value, error: "" }))}
                className="rounded-xl"
              />
            </div>

            {pwModal.error && <p className="text-xs text-destructive">{pwModal.error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPwModal((m) => ({ ...m, open: false }))} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSavePassword} disabled={pwModal.saving} className="rounded-xl">
                {pwModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Truck Breakdown Report Modal ── */}
      <Dialog open={breakdownModal} onOpenChange={setBreakdownModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" /> Report Truck Issue
            </DialogTitle>
            <DialogDescription>
              Submit an urgent breakdown notice for your assigned truck ({driverData?.truck_name || "Truck A"}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Issue Type</Label>
              <select
                value={breakdownReason}
                onChange={(e) => setBreakdownReason(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
              >
                <option value="Flat Tire / Puncture">Flat Tire / Puncture</option>
                <option value="Engine Overheating">Engine Overheating / Stall</option>
                <option value="Compactor Hydraulic Failure">Compactor Hydraulic Failure</option>
                <option value="Brake / Steering Issue">Brake / Steering Issue</option>
                <option value="Fuel / Oil Leak">Fuel / Oil Leak</option>
                <option value="Road Accident">Road Accident / Minor Collision</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Location & Details (Optional)</Label>
              <Input
                value={breakdownNote}
                onChange={(e) => setBreakdownNote(e.target.value)}
                placeholder="e.g. Near Barangay Malabanban Norte church"
                className="rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBreakdownModal(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleReportBreakdown}
                disabled={reportingBreakdown}
                className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs"
              >
                {reportingBreakdown ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Alert to Dispatch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorProfile;
