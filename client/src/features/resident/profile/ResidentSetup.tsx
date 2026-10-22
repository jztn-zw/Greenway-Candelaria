import { toast } from "@/lib/toast";
import { getActionErrorMessage } from "@/lib/feedbackMessages";
import { useCallback,useRef,useState } from "react";
import { useResidentQuery,useResidentMutation } from "@/lib/residentQuery";
import { useNavigate } from "react-router-dom";
import { ArrowRight, SquarePen, Users } from "lucide-react";
import { profileAvatarForAccount, profileAvatarSrc } from "@/components/common/profileAvatars";
import { ProfileAvatarImage, ProfileAvatarPicker } from "@/components/common/ProfileAvatarPicker";
import { FormDialog } from "@/components/dialogs/FormDialog";
import { formDialogStyles } from "@/components/dialogs/formDialogStyles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputClearButton } from "@/components/common/InputClearButton";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import authService from "@/services/authService";
import { fetchBarangays,fetchBarangayStreets } from "@/services/barangaysService";
import useAuthStore from "@/store/authStore";
import useLogout from "@/hooks/useLogout";
import ResidentLocationPicker from "./ResidentLocationPicker";
import { locationMatchesStreet, type ResidentSetupLocation } from "./residentLocation";

type ClearableSetupInputProps = Omit<React.ComponentProps<typeof Input>, "value"> & {
  value: string;
  clearLabel: string;
  onClear: () => void;
};

const ClearableSetupInput = ({ value, clearLabel, onClear, className, ...props }: ClearableSetupInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <Input ref={inputRef} {...props} value={value} className={`${className ?? ""} ${value ? "pr-8" : ""}`} />
      {value && !props.disabled && !props.readOnly && (
        <InputClearButton label={clearLabel} onClick={() => { onClear(); inputRef.current?.focus(); }} />
      )}
    </div>
  );
};

export default function ResidentSetup() {
  const navigate = useNavigate();
  const logout = useLogout();
  const user = useAuthStore(state => state.user);
  const [avatar, setAvatar] = useState(() => profileAvatarForAccount(user?.id, user?.avatar_url));
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+63/, "") || "");
  const [email, setEmail] = useState(user?.email || "");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [location, setLocation] = useState<ResidentSetupLocation | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const changeLocation = useCallback((value: ResidentSetupLocation | null, confirmed: boolean) => {
    setLocation(value); setLocationConfirmed(confirmed);
    setErrors(previous => ({ ...previous, resident_location: "", form: "" }));
  }, []);
  // Pending accounts cannot join the full resident socket stream. Reconcile
  // public area choices here until profile completion grants that access.
  const areasQuery = useResidentQuery("barangays", ["locations"], fetchBarangays, { scope: "account", refetchInterval: 60_000 });
  const streetsQuery = useResidentQuery("barangays", ["streets", barangay, "setup-location"], () => fetchBarangayStreets(barangay, true),
    { enabled: !!barangay, scope: "account", refetchInterval: 60_000 });
  const barangays = areasQuery.data ?? [];
  const streets = streetsQuery.data?.streets ?? [];
  const areaLoading = areasQuery.isLoading;
  const streetLoading = !!barangay && streetsQuery.isLoading;
  const areaError = areasQuery.isError ? "Couldn't load barangays. Please retry." : "";
  const streetError = streetsQuery.isError ? "Couldn't load streets. Please retry." : "";
  const completeProfile = useResidentMutation(authService.completeResidentProfile, "profile", "settings");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => setErrors(previous => ({ ...previous, [field]: "", form: "" }));
  const chooseStreet = (value: string) => {
    setStreet(value); changeLocation(null, true); clearError("street_id");
  };
  const selectedBarangay = barangays.find(row => row.id === barangay);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || areaLoading || streetLoading || areaError || streetError) return;
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2 || fullName.trim().length > 100) next.full_name = "Enter your full name (2–100 characters)";
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) next.username = "Use 3–20 letters, numbers, or underscores";
    if (phone && !/^9\d{9}$/.test(phone)) next.phone = "Enter a 10-digit Philippine mobile number starting with 9";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address";
    if (!barangay || !barangays.some(row => row.id === barangay)) next.barangay_id = "Select your barangay";
    const selectedStreet = streets.find(row => row.id === street);
    if (barangay && !streets.length) next.street_id = "No streets are listed for this barangay. Contact MENRO to add your street before completing setup.";
    else if (!selectedStreet) next.street_id = "Select your street";
    if (!location || !locationConfirmed || !locationMatchesStreet(location, selectedStreet)) next.resident_location = "Choose and confirm your location to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const owner = useAuthStore.getState();
    const isCurrent = () => useAuthStore.getState().user?.id === owner.user?.id && useAuthStore.getState().token === owner.token;
    setSaving(true);
    try {
      const updated = await completeProfile({ full_name: fullName.trim(), username: username.trim(),
        avatar_url: profileAvatarSrc(avatar),
        email: email.trim() || null, phone: phone ? `+63${phone}` : null, barangay_id: barangay, street_id: selectedStreet?.id ?? null,
        location_required: true, resident_location: location });
      if (!isCurrent()) return;
      if (updated.id !== owner.user?.id || updated.profile_completed !== true) throw new Error("Couldn't confirm your saved profile. Please retry.");
      useAuthStore.getState().setUser(updated);
      toast.success("Your resident profile is ready");
      navigate("/resident", { replace: true });
    } catch (error) {
      if (!isCurrent()) return;
      toast.error("Could not save your resident profile", { description: getActionErrorMessage(error) });
      const response = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      const message = response?.message || (error instanceof Error ? error.message : "Couldn't save your profile. Please retry.");
      const validation = Object.fromEntries((response?.errors || []).map(issue => [issue.field.startsWith("resident_location") ? "resident_location" : issue.field, issue.message]));
      setErrors(message === "Username is already in use" ? { username: message } : Object.keys(validation).length ? validation : { form: message });
    } finally { if (isCurrent()) setSaving(false); }
  };
  const fieldError = (field: string) => errors[field] ? <p id={`setup-${field}-error`} role="alert" className="text-xs text-destructive">{errors[field]}</p> : null;
  const accessibility = (field: string) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `setup-${field}-error` : undefined });

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex lg:items-center">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <form onSubmit={save} noValidate aria-labelledby="setup-title" className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="flex items-start gap-4 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-7 sm:py-6">
            <button type="button" aria-label="Choose profile avatar" disabled={saving} onClick={() => setAvatarOpen(true)} className="relative size-14 shrink-0 rounded-full border border-primary/20 bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <ProfileAvatarImage avatarId={avatar} />
              <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border/80 bg-card text-primary shadow-2xs"><SquarePen className="size-3" /></span>
            </button>
            <div className="min-w-0">
              <h1 id="setup-title" className="font-display text-ui-page font-semibold leading-snug tracking-tight">Complete Your Resident Profile</h1>
              <p className="mt-1 text-ui-label leading-relaxed text-muted-foreground">Add your name and collection area to get started.</p>
              {user?.username && <p className="mt-2 break-words text-ui-caption text-muted-foreground">Signed in as <span className="font-medium text-foreground">@{user.username}</span></p>}
            </div>
          </div>
          <fieldset disabled={saving} className="min-w-0">
            <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              {errors.form && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.form}</p>}
              <section aria-label="Personal Details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={`space-y-2 ${user?.username ? "sm:col-span-2" : ""}`}>
                    <Label className={formDialogStyles.label} htmlFor="setup-full-name">Full Name</Label>
                    <ClearableSetupInput className="min-h-11 sm:min-h-9" fieldSize="compact" id="setup-full-name" autoComplete="name" maxLength={100} value={fullName} onChange={event => { setFullName(event.target.value); clearError("full_name"); }} onClear={() => { setFullName(""); clearError("full_name"); }} clearLabel="Clear full name" placeholder="Enter your full name" {...accessibility("full_name")} />
                    {fieldError("full_name")}
                  </div>
                  {!user?.username && <div className="space-y-2">
                    <Label className={formDialogStyles.label} htmlFor="setup-username">Username</Label>
                    <ClearableSetupInput className="min-h-11 sm:min-h-9" fieldSize="compact" id="setup-username" autoComplete="username" maxLength={20} value={username} onChange={event => { setUsername(event.target.value); clearError("username"); }} onClear={() => { setUsername(""); clearError("username"); }} clearLabel="Clear username" placeholder="Choose a username" {...accessibility("username")} />
                    {fieldError("username")}
                  </div>}
                </div>
              </section>
              <section aria-labelledby="setup-area-heading" className="border-t border-border/60 pt-5">
                <h2 id="setup-area-heading" className="text-sm font-semibold">Collection Area</h2>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">Choose your barangay and street in Candelaria.</p>
                  <div className="space-y-2">
                    <Label className={formDialogStyles.label} htmlFor="setup-barangay">Barangay</Label>
                    <SearchableSelect className="min-h-11 sm:min-h-9" fieldSize="compact" id="setup-barangay" aria-label="Barangay" value={barangay} onValueChange={value => { setBarangay(value); setStreet(""); changeLocation(null, false); clearError("barangay_id"); clearError("street_id"); }} options={barangays.map(row => ({ value: row.id, label: row.name }))} placeholder={areaLoading ? "Loading barangays…" : "Select your barangay"} searchPlaceholder="Search by barangay name…" compactSearchPlaceholder="Barangay name…" disabled={saving || areaLoading || Boolean(areaError)} {...accessibility("barangay_id")} />
                    {fieldError("barangay_id")}
                  </div>
                {selectedBarangay && <ResidentLocationPicker key={barangay} barangay={selectedBarangay} streets={streets} streetId={street}
                  value={location} confirmed={locationConfirmed} disabled={saving || streetLoading || Boolean(streetError)} onChange={changeLocation} onStreetChange={chooseStreet} />}
                {fieldError("resident_location")}
                {fieldError("street_id")}
                {(areaError || streetError) && <div role="alert" className="mt-3 flex items-center justify-between gap-3 text-sm text-destructive"><span>{areaError || streetError}</span><Button variant="outline" type="button" onClick={() => { if (areaError) void areasQuery.refetch(); if (streetError) void streetsQuery.refetch(); }}>Retry</Button></div>}
                {barangay && !streetLoading && !streetError && !streets.length && <p className="mt-3 text-xs text-muted-foreground">No streets are listed for this barangay. Contact MENRO to add your street before completing setup.</p>}
              </section>
              <section aria-labelledby="setup-contact-heading" className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <h2 id="setup-contact-heading" className="text-sm font-semibold">Contact Details <span className="font-normal text-muted-foreground">(Optional)</span></h2>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">MENRO may use your email or phone number to ask for more details or follow up on a waste report. You can leave these blank and add them later in your profile.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={formDialogStyles.label} htmlFor="setup-email">Email Address</Label>
                    <ClearableSetupInput className="min-h-11 sm:min-h-9" fieldSize="compact" id="setup-email" type="email" autoComplete="email" maxLength={100} value={email} onChange={event => { setEmail(event.target.value); clearError("email"); }} onClear={() => { setEmail(""); clearError("email"); }} clearLabel="Clear email address" placeholder="Enter your email address" {...accessibility("email")} />
                    {fieldError("email")}
                  </div>
                  <div className="space-y-2">
                    <Label className={formDialogStyles.label} htmlFor="setup-phone">Phone Number</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center border-r border-input/80 px-3 text-sm text-muted-foreground">+63</span>
                      <ClearableSetupInput fieldSize="compact" id="setup-phone" type="tel" inputMode="numeric" maxLength={10} className="pl-16 min-h-11 sm:min-h-9" placeholder="9XX XXX XXXX" value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, "")); clearError("phone"); }} onClear={() => { setPhone(""); clearError("phone"); }} clearLabel="Clear phone number" {...accessibility("phone")} />
                    </div>
                    {fieldError("phone")}
                  </div>
                </div>
              </section>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <Button type="button" variant="destructive-ghost" size="sm" className="h-11 w-full sm:h-9 sm:w-auto" disabled={saving} onClick={() => { void logout().catch(() => {}); }}>Log Out</Button>
              <Button type="submit" size="sm" className="h-11 w-full sm:h-9 sm:w-auto" disabled={saving || areaLoading || streetLoading || Boolean(areaError || streetError) || Boolean(barangay && !streets.length)} loading={saving} loadingLabel="Saving profile…">Save and Continue<ArrowRight aria-hidden="true" /></Button>
            </div>
          </fieldset>
        </form>
      </main>
      <FormDialog open={avatarOpen} onOpenChange={setAvatarOpen} title="Choose Avatar" description="Choose a profile avatar for your account." icon={<Users />}
        footer={<Button type="button" variant="outline" className={formDialogStyles.cancelButton} onClick={() => setAvatarOpen(false)}>Close</Button>}>
        <ProfileAvatarPicker selected={avatar} onSelect={selected => { setAvatar(selected); setAvatarOpen(false); }} />
      </FormDialog>
    </div>
  );
}
