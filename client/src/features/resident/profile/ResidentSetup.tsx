import { useState } from "react";
import { useResidentQuery,useResidentMutation } from "@/lib/residentQuery";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import authService from "@/services/authService";
import { fetchBarangays,fetchBarangayStreets } from "@/services/barangaysService";
import useAuthStore from "@/store/authStore";
import useLogout from "@/hooks/useLogout";

export default function ResidentSetup() {
  const navigate = useNavigate();
  const logout = useLogout();
  const user = useAuthStore(state => state.user);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+63/, "") || "");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  // Pending accounts cannot join the full resident socket stream. Reconcile
  // public area choices here until profile completion grants that access.
  const areasQuery = useResidentQuery("barangays", ["locations"], fetchBarangays, { scope: "account", refetchInterval: 60_000 });
  const streetsQuery = useResidentQuery("barangays", ["streets", barangay], () => fetchBarangayStreets(barangay),
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
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || areaLoading || streetLoading || areaError || streetError) return;
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2 || fullName.trim().length > 100) next.full_name = "Enter your full name (2–100 characters)";
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) next.username = "Use 3–20 letters, numbers, or underscores";
    if (!phone) next.phone = "Enter your phone number";
    else if (!/^9\d{9}$/.test(phone)) next.phone = "Enter a 10-digit Philippine mobile number starting with 9";
    if (!barangay || !barangays.some(row => row.id === barangay)) next.barangay_id = "Select your barangay";
    const selectedStreet = streets.find(row => row.id === street);
    if (streets.length && !selectedStreet) next.street_id = "Select your street";
    setErrors(next);
    if (Object.keys(next).length) return;
    const owner = useAuthStore.getState();
    const isCurrent = () => useAuthStore.getState().user?.id === owner.user?.id && useAuthStore.getState().token === owner.token;
    setSaving(true);
    try {
      const updated = await completeProfile({ full_name: fullName.trim(), username: username.trim(),
        phone: `+63${phone}`, barangay_id: barangay, street_id: selectedStreet?.id ?? null });
      if (!isCurrent()) return;
      if (updated.id !== owner.user?.id || updated.profile_completed !== true) throw new Error("Couldn't confirm your saved profile. Please retry.");
      useAuthStore.getState().setUser(updated);
      navigate("/resident", { replace: true });
    } catch (error) {
      if (!isCurrent()) return;
      const response = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      const message = response?.message || (error instanceof Error ? error.message : "Couldn't save your profile. Please retry.");
      const validation = Object.fromEntries((response?.errors || []).map(issue => [issue.field, issue.message]));
      setErrors(message === "Username is already in use" ? { username: message } : Object.keys(validation).length ? validation : { form: message });
    } finally { if (isCurrent()) setSaving(false); }
  };
  const fieldError = (field: string) => errors[field] ? <p id={`setup-${field}-error`} role="alert" className="text-xs text-destructive">{errors[field]}</p> : null;
  const accessibility = (field: string) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `setup-${field}-error` : undefined });

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex lg:items-center">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:w-full lg:max-w-4xl lg:py-6">
        <form onSubmit={save} noValidate aria-labelledby="setup-title" className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
            <h1 id="setup-title" className="font-display text-ui-page font-semibold tracking-tight">Complete Your Resident Profile</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Add your details and collection area to get started.</p>
          </div>
          <fieldset disabled={saving} className="min-w-0">
            <div className="space-y-6 px-5 pb-7 sm:px-8">
              {errors.form && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.form}</p>}
              <section aria-labelledby="setup-personal-heading">
                <h2 id="setup-personal-heading" className="mb-4 text-sm font-semibold">Personal Details</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="setup-full-name">Full Name</Label>
                    <Input id="setup-full-name" autoComplete="name" maxLength={100} value={fullName} onChange={event => { setFullName(event.target.value); clearError("full_name"); }} placeholder="Enter your full name" {...accessibility("full_name")} />
                    {fieldError("full_name")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-username">Username</Label>
                    <Input id="setup-username" autoComplete="username" maxLength={20} value={username} onChange={event => { setUsername(event.target.value); clearError("username"); }} placeholder="Choose a username" {...accessibility("username")} />
                    {fieldError("username")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-phone">Phone Number</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-input/80 px-3 text-sm text-muted-foreground">+63</span>
                      <Input id="setup-phone" type="tel" inputMode="numeric" required maxLength={10} className="pl-16" placeholder="9XX XXX XXXX" value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, "")); clearError("phone"); }} {...accessibility("phone")} aria-describedby={`setup-phone-help${errors.phone ? " setup-phone-error" : ""}`} />
                    </div>
                    {fieldError("phone")}
                  </div>
                </div>
                <p id="setup-phone-help" className="mt-3 text-xs leading-relaxed text-muted-foreground">We need your phone number so staff can contact you if they need more information about a report.</p>
              </section>
              <section aria-labelledby="setup-area-heading" className="border-t border-border pt-6">
                <h2 id="setup-area-heading" className="text-sm font-semibold">Collection Area</h2>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">Choose your barangay and street in Candelaria.</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="setup-barangay">Barangay</Label>
                    <SearchableSelect id="setup-barangay" aria-label="Barangay" value={barangay} onValueChange={value => { setBarangay(value); setStreet(""); clearError("barangay_id"); clearError("street_id"); }} options={barangays.map(row => ({ value: row.id, label: row.name }))} placeholder={areaLoading ? "Loading barangays…" : "Select your barangay"} searchPlaceholder="Search by barangay name…" compactSearchPlaceholder="Barangay name…" disabled={saving || areaLoading || Boolean(areaError)} {...accessibility("barangay_id")} />
                    {fieldError("barangay_id")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-street">Street</Label>
                    <SearchableSelect id="setup-street" aria-label="Street" value={street} onValueChange={value => { setStreet(value); clearError("street_id"); }} options={streets.map(row => ({ value: row.id, label: row.area ? `${row.name} (${row.area})` : row.name }))} placeholder={!barangay ? "Select barangay first" : streetLoading ? "Loading streets…" : !streets.length ? "No streets listed" : "Select your street"} searchPlaceholder="Search by street or area…" compactSearchPlaceholder="Street or area…" disabled={saving || !barangay || streetLoading || !streets.length || Boolean(streetError)} {...accessibility("street_id")} />
                    {fieldError("street_id")}
                  </div>
                </div>
                {(areaError || streetError) && <div role="alert" className="mt-3 flex items-center justify-between gap-3 text-sm text-destructive"><span>{areaError || streetError}</span><Button variant="outline" type="button" onClick={() => { if (areaError) void areasQuery.refetch(); if (streetError) void streetsQuery.refetch(); }}>Retry</Button></div>}
                {barangay && !streetLoading && !streetError && !streets.length && <p className="mt-3 text-xs text-muted-foreground">No streets are listed for this barangay. You can continue with your barangay.</p>}
              </section>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <Button type="button" variant="destructive-ghost" size="lg" className="w-full sm:w-auto" disabled={saving} onClick={() => { void logout().catch(() => {}); }}>Log Out</Button>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={saving || areaLoading || streetLoading || Boolean(areaError || streetError)} loading={saving} loadingLabel="Saving profile…">Save and Continue<ArrowRight aria-hidden="true" /></Button>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}
