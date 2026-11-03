import { getActionErrorMessage } from "@/lib/feedbackMessages";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import ListEmptyState from "@/components/common/ListEmptyState";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import { SearchInput } from "@/components/common/SearchInput";
import { AdminConfirmationDialog as ConfirmationDialog } from "@/components/admin/AdminModal";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { PageRetryContext } from "@/components/feedback/pageRetryContext";
import { AdminModal as FormDialog } from "@/components/admin/AdminModal";
import { AdminUnsavedChangesDialog as UnsavedChangesDialog } from "@/components/admin/AdminModal";
import { BarangayManagerPageSkeleton, BarangayStreetRowsSkeleton } from "@/components/loading/PageLoadingSkeletons";

import { Button } from "@/components/ui/button";
import { formDialogStyles } from "@/components/dialogs/formDialogStyles";
import { adminBarangayStyles as styles } from "@/components/common/communityContentStyles";
import { badgeStyles } from "@/components/ui/badgeStyles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminMutation, useAdminResource } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  createBarangayStreet as apicreateBarangayStreet,
  deleteBarangayStreet as apideleteBarangayStreet,
  updateBarangayCollectionService as apiupdateBarangayCollectionService,
  updateBarangayStreet as apiupdateBarangayStreet,
  updateBarangayStreetCoverage as apiupdateBarangayStreetCoverage,
  fetchBarangaysManager,
  fetchManagedStreets,
  type BarangayManagerRow,
  type ManagedStreet,
  type CoverageEdit,
} from "@/services/barangaysService";
import { MapPin, MapPinned, SquarePen, Plus, Route, Search, Trash2, Truck } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import StreetCoverageEditor, { type CoveragePoint } from "./StreetCoverageEditor";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

const AdminBarangays = () => {
  const createBarangayStreet = useAdminMutation(apicreateBarangayStreet, "barangays", "routes", "tracking", "schedule");
  const deleteBarangayStreet = useAdminMutation(apideleteBarangayStreet, "barangays", "routes", "tracking", "schedule");
  const updateBarangayCollectionService = useAdminMutation(apiupdateBarangayCollectionService, "barangays", "routes", "tracking", "schedule");
  const updateBarangayStreet = useAdminMutation(apiupdateBarangayStreet, "barangays", "routes", "tracking", "schedule");
  const updateBarangayStreetCoverage = useAdminMutation(apiupdateBarangayStreetCoverage, "barangays", "routes", "tracking", "schedule");
  const [selectedId, setSelectedId] = useState("");
  const selectedIdRef = useRef("");
  const [search, setSearch] = useState("");
  const barangaySearchRef = useRef<HTMLInputElement>(null);
  const [streetSearch, setStreetSearch] = useState("");
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showDiscardStreetConfirm, setShowDiscardStreetConfirm] = useState(false);
  const [editingStreet, setEditingStreet] = useState<ManagedStreet | null>(null);
  const [streetName, setStreetName] = useState("");
  const [streetArea, setStreetArea] = useState("");
  const [formError, setFormError] = useState("");
  const [streetNameError, setStreetNameError] = useState("");
  const [streetAreaError, setStreetAreaError] = useState("");
  const [isSavingStreet, setIsSavingStreet] = useState(false);
  const [deletingStreet, setDeletingStreet] = useState<ManagedStreet | null>(null);
  const [isDeletingStreet, setIsDeletingStreet] = useState(false);
  const [coverageStreet, setCoverageStreet] = useState<ManagedStreet | null>(null);
  const [isSavingCoverage, setIsSavingCoverage] = useState(false);

  const overviewQuery = useAdminResource<BarangayManagerRow[]>("barangays", ["manager"], fetchBarangaysManager, []);
  const streetsQuery = useAdminResource<ManagedStreet[]>("barangays", ["streets", selectedId], async () =>
    (await fetchManagedStreets(selectedId)).streets, [], { enabled: !!selectedId });
  const { data: barangays, setData: setBarangays, isLoading: isLoadingBarangays, refetch: retryOverview } = overviewQuery;
  const { data: streets, setData: setStreets, isLoading: isLoadingStreets, refetch: retryStreets } = streetsQuery;
  const overviewError = overviewQuery.dataUpdatedAt === 0 ? overviewQuery.error?.message ?? "" : "";
  const streetsError = streetsQuery.dataUpdatedAt === 0 ? streetsQuery.error?.message ?? "" : "";
  useLayoutEffect(() => {
    setSelectedId((current) => current && barangays.some((row) => row.id === current) ? current
      : "");
  }, [barangays]);
  useEffect(() => { selectedIdRef.current = selectedId; setStreetSearch(""); }, [selectedId]);

  const selectedBarangay = barangays.find((row) => row.id === selectedId) ?? null;
  const visibleBarangays = useMemo(
    () => barangays.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase())),
    [barangays, search],
  );
  const totalBarangays = barangays.length;
  const serviceCount = barangays.filter((row) => row.collection_service_available).length;
  const noServiceCount = totalBarangays - serviceCount;
  const totalStreets = barangays.reduce((sum, row) => sum + (row.street_count || 0), 0);
  const streetsWithPath = barangays.reduce((sum, row) => sum + (row.streets_with_path || 0), 0);
  const serviceAvailabilityRate = totalBarangays > 0 ? Math.round((serviceCount / totalBarangays) * 100) : 0;
  const barangayMetricsAvailable = !isLoadingBarangays && !overviewError;
  const unavailableMetricSubtitle = isLoadingBarangays ? "Loading barangay data" : "Barangay data unavailable";

  const kpis = [
    {
      label: "Total Barangays",
      value: barangayMetricsAvailable ? totalBarangays : "—",
      subtitle: barangayMetricsAvailable ? "Candelaria municipality" : unavailableMetricSubtitle,
      tone: "neutral" as const,
      icon: MapPin,
    },
    {
      label: "Service Available",
      value: barangayMetricsAvailable ? serviceCount : "—",
      subtitle: barangayMetricsAvailable
        ? totalBarangays > 0
          ? `${serviceAvailabilityRate}% of barangays (${serviceCount} of ${totalBarangays})`
          : "No barangays to measure"
        : unavailableMetricSubtitle,
      tone: "success" as const,
      icon: Truck,
    },
    {
      label: "Service Unavailable",
      value: barangayMetricsAvailable ? noServiceCount : "—",
      subtitle: barangayMetricsAvailable
        ? totalBarangays > 0 ? "Collection service marked unavailable" : "No barangays to measure"
        : unavailableMetricSubtitle,
      tone: "warning" as const,
      icon: Truck,
    },
    {
      label: "Street Records",
      value: barangayMetricsAvailable ? totalStreets : "—",
      subtitle: barangayMetricsAvailable
        ? totalStreets > 0
          ? `${streetsWithPath} of ${totalStreets} have a saved coverage path`
          : "No street records"
        : unavailableMetricSubtitle,
      tone: "info" as const,
      icon: Route,
    },
  ];
  const visibleStreets = useMemo(() => {
    const query = streetSearch.trim().toLowerCase();
    return query
      ? streets.filter((street) => `${street.name} ${street.area ?? ""}`.toLowerCase().includes(query))
      : streets;
  }, [streets, streetSearch]);
  const serviceRestriction = !selectedBarangay
    ? null
    : selectedBarangay.collection_service_available
      ? selectedBarangay.live_run_count > 0
        ? `Complete or cancel ${selectedBarangay.live_run_count} upcoming or ongoing ${selectedBarangay.live_run_count === 1 ? "route run" : "route runs"} before disabling service.`
        : selectedBarangay.active_route_count > 0
        ? `Pause ${selectedBarangay.active_route_count} active route ${selectedBarangay.active_route_count === 1 ? "schedule" : "schedules"} before disabling service.`
        : null
      : selectedBarangay.status !== "ACTIVE"
        ? "Activate this barangay before enabling service."
        : selectedBarangay.street_count === 0
          ? "Add a street before enabling service."
          : null;

  const openCreate = () => {
    setShowDiscardStreetConfirm(false);
    setEditingStreet(null);
    setStreetName("");
    setStreetArea("");
    setFormError("");
    setStreetNameError("");
    setStreetAreaError("");
    setEditorOpen(true);
  };

  const openEdit = (street: ManagedStreet) => {
    setShowDiscardStreetConfirm(false);
    setEditingStreet(street);
    setStreetName(street.name);
    setStreetArea(street.area ?? "");
    setFormError("");
    setStreetNameError("");
    setStreetAreaError("");
    setEditorOpen(true);
  };

  const closeStreetEditor = () => {
    setShowDiscardStreetConfirm(false);
    setEditorOpen(false);
    setStreetName("");
    setStreetArea("");
    setFormError("");
    setStreetNameError("");
    setStreetAreaError("");
  };

  const isStreetDirty = streetName !== (editingStreet?.name ?? "")
    || streetArea !== (editingStreet?.area ?? "");

  const requestCloseStreetEditor = () => {
    if (isSavingStreet) return;
    if (isStreetDirty) setShowDiscardStreetConfirm(true);
    else closeStreetEditor();
  };

  const saveStreet = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || isSavingStreet) return;
    const name = streetName.trim();
    const area = streetArea.trim();
    const duplicate = streets.some((street) => street.id !== editingStreet?.id
      && street.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
      && (street.area ?? "").trim().toLocaleLowerCase() === area.toLocaleLowerCase());
    const nameError = !name ? "Street name is required."
      : name.length > 150 ? "Street name must be 150 characters or fewer."
      : duplicate ? "This street and area already exist in the barangay." : "";
    const areaError = area.length > 100 ? "Area must be 100 characters or fewer." : "";
    setStreetNameError(nameError);
    setStreetAreaError(areaError);
    if (nameError || areaError) return;
    setFormError("");
    setIsSavingStreet(true);
    try {
      const payload = { name, area: area || null };
      if (editingStreet) await updateBarangayStreet(selectedId, editingStreet.id, payload);
      else await createBarangayStreet(selectedId, payload);
      closeStreetEditor();
      toast.success(editingStreet ? "Street updated." : "Street added.");

    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const message = errorMessage(error);
      toast.error("Could not save street", { description: getActionErrorMessage(error) });
      if (status === 400 || status === 409 || /street and area already exist/i.test(message)) {
        if (status === 400 && /^area\b/i.test(message)) setStreetAreaError(message);
        else setStreetNameError(message);
      } else setFormError(message);
    } finally {
      setIsSavingStreet(false);
    }
  };

  const setAvailability = async (available: boolean) => {
    if (!selectedId) return;
    setIsSavingAvailability(true);
    try {
      await updateBarangayCollectionService(selectedId, available);
      setBarangays((current) => current.map((row) => row.id === selectedId ? { ...row, collection_service_available: available } : row));
      toast.success(available ? "Collection service enabled." : "Collection service marked unavailable.");

    } catch (error) {
      toast.error("Could not update collection availability", { description: getActionErrorMessage(error) });
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedId || !deletingStreet) return;
    setIsDeletingStreet(true);
    try {
      await deleteBarangayStreet(selectedId, deletingStreet.id);
      setStreets((current) => current.filter((street) => street.id !== deletingStreet.id));
      setBarangays((current) => current.map((row) => row.id === selectedId ? {
        ...row,
        street_count: Math.max(0, row.street_count - 1),
        streets_with_path: Math.max(0, row.streets_with_path - (deletingStreet.coverage_path?.length ? 1 : 0)),
      } : row));
      setDeletingStreet(null);
      toast.success("Street deleted.");

    } catch (error) {
      toast.error("Could not delete street", { description: getActionErrorMessage(error) });
    } finally {
      setIsDeletingStreet(false);
    }
  };

  const saveStreetCoverage = async (path: CoveragePoint[] | null, edit?: CoverageEdit | null) => {
    if (!coverageStreet) return;
    const barangayId = coverageStreet.barangay_id;
    if (!barangayId) return;
    setIsSavingCoverage(true);
    try {
      await updateBarangayStreetCoverage(barangayId, coverageStreet.id, path, edit ?? null);
      setStreets((current) => current.map((street) =>
        street.id === coverageStreet.id ? { ...street, coverage_path: path, coverage_edit: edit ?? null } : street,
      ));
      const pathDelta = Number(Boolean(path?.length)) - Number(Boolean(coverageStreet.coverage_path?.length));
      if (pathDelta) {
        setBarangays((current) => current.map((row) => row.id === barangayId
          ? { ...row, streets_with_path: Math.max(0, row.streets_with_path + pathDelta) }
          : row));
      }
      toast.success(path ? "Street coverage path saved." : "Street coverage path cleared.");
    } finally {
      setIsSavingCoverage(false);
    }
  };

  const selectBarangay = (barangayId: string) => {
    if (isSavingStreet || isDeletingStreet || isSavingAvailability || isSavingCoverage) return;
    closeStreetEditor();
    setCoverageStreet(null);
    setDeletingStreet(null);
    setSelectedId(barangayId);
  };

  if (isLoadingBarangays) return <BarangayManagerPageSkeleton />;
  if (overviewError) return <PageErrorState kind="unavailable" description="We couldn't load barangays. Please try again." onRetry={() => void retryOverview()} retrying={overviewQuery.isFetching} homeHref="/admin" />;

  return (
    <PageRetryContext.Provider value={true}>
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title="Barangay Management"
        description="Manage municipal barangays, street records, and collection service availability."
      />

      {(overviewQuery.error || streetsQuery.error) && <DataRefreshNotice primary message="Some barangay or street information couldn't load or refresh. Available information is still shown; previously loaded data may be outdated." onRetry={() => { if (overviewQuery.error) void retryOverview(); if (streetsQuery.error) void retryStreets(); }} retrying={overviewQuery.isFetching || streetsQuery.isFetching} />}

      {/* ── Executive Metric KPI Strip ── */}
      <AdminKpiGrid>
        {kpis.map((kpi) => (
          <AdminKpiCard key={kpi.label} label={kpi.label} value={kpi.value}
            description={kpi.subtitle} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </AdminKpiGrid>

      {/* ── Main Two-Column Layout matching Reference Mockup ── */}
      <div className={styles.layout}>
        {/* ── Left Column: Barangays Card ── */}
        <aside className={styles.panel}>
          <h2 className="gw-heading text-base tracking-tight text-foreground">
            Barangays
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Select a barangay to manage its streets.</p>

          <SearchInput
            ref={barangaySearchRef}
            placeholder="Search by barangay name…" compactPlaceholder="Barangay name…"
            value={search}
            onChange={setSearch}
            aria-label="Search barangays"
            containerClassName="mt-3"
          />

          <div className={styles.list}>
            {visibleBarangays.length === 0 ? (
              <ListEmptyState variant="inline" icon={MapPin} title="No Barangays Found."
                description="Try another barangay name or clear your search." />
            ) : (
              visibleBarangays.map((barangay) => {
                const isSelected = selectedId === barangay.id;
                return (
                  <button
                    key={barangay.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectBarangay(barangay.id)}
                    disabled={isSavingStreet || isDeletingStreet || isSavingAvailability || isSavingCoverage}
                    className={cn(
                      styles.choice,
                      "w-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60",
                      isSelected
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/50 bg-muted/10 hover:bg-[var(--button-neutral-hover)] hover:border-border/80"
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/30 text-success-foreground"
                          : "bg-muted/40 border-border/60 text-muted-foreground"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-foreground leading-snug">
                        {barangay.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {barangay.street_count} {barangay.street_count === 1 ? "street" : "streets"}
                      </p>
                      <p className={cn("mt-1 text-ui-caption", barangay.collection_service_available ? "text-success-foreground" : "text-muted-foreground")}>
                        {barangay.collection_service_available
                              ? "Collection available"
                              : "Collection unavailable"}
                      </p>
                    </div>

                  </button>
                );
              })
            )}
          </div>

          <div className="pt-3.5 mt-3 border-t border-border/60 text-xs text-muted-foreground">
            {isLoadingBarangays
              ? "Loading…"
              : overviewError
                ? "Barangay list unavailable"
              : visibleBarangays.length === 0
                ? search.trim() ? "No matching barangays" : "0 barangays"
                : search.trim()
                  ? `${visibleBarangays.length} of ${barangays.length} barangays match`
                  : `${barangays.length} barangays`}
          </div>
        </aside>

        {/* ── Right Column: Selected Barangay Details & Streets Card ── */}
        <section className={cn(styles.panel, styles.detail)} aria-label="Barangay details">
          {!selectedBarangay ? (
            <>
              <div className={styles.header}>
                <h2 className="gw-heading text-base tracking-tight text-foreground">Barangay Details</h2>
                <span className={cn("rounded-lg border px-2 py-1 text-ui-caption", badgeStyles.neutral.className)}>
                  No barangay selected
                </span>
              </div>
              <div className="flex min-h-80 flex-col items-center justify-center px-3 py-10 text-center sm:min-h-96">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <MapPinned className="size-6" aria-hidden="true" />
                </div>
                <h3 className="gw-heading text-xl tracking-tight text-foreground">Choose a Barangay</h3>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Select a barangay from the list to view its streets, update collection availability, and manage coverage paths.
                </p>
                <Button
                  className="mt-5 gap-2 rounded-xl text-xs"
                  onClick={() => barangaySearchRef.current?.focus()}
                  disabled={barangays.length === 0}
                >
                  <Search className="size-4" aria-hidden="true" /> Find a Barangay
                </Button>
                <p className="mt-4 text-ui-caption text-muted-foreground">Your selection will appear here.</p>
              </div>
            </>
          ) : (
            <>
              {/* Header row */}
              <div className={styles.header}>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="mb-1 text-xs text-muted-foreground">Selected barangay</p>
                  <h2 className="gw-heading break-words text-xl tracking-tight text-foreground">
                    Barangay {selectedBarangay.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedBarangay.street_count} {selectedBarangay.street_count === 1 ? "street" : "streets"} on record
                  </p>
                </div>

                <Button
                  onClick={openCreate}
                  className={cn(styles.action, "ml-auto")}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" /> Add Street
                </Button>
              </div>

              {/* Truck Collection Service Banner */}
              <div className={styles.service}>
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Truck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor="collection-service"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Truck Collection Service
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedBarangay.collection_service_available
                        ? "Marked available in this barangay"
                        : "Marked unavailable in this barangay"}
                    </p>
                    {serviceRestriction && (
                      <p className="text-ui-caption text-warning-foreground/90 mt-0.5">
                        {serviceRestriction}
                      </p>
                    )}
                  </div>
                </div>

                <Switch
                  id="collection-service"
                  checked={selectedBarangay.collection_service_available}
                  onCheckedChange={(checked) => void setAvailability(checked)}
                  disabled={isSavingAvailability || Boolean(serviceRestriction)}
                  className="mt-1 shrink-0"
                  aria-label={`Collection service for ${selectedBarangay.name}`}
                />
              </div>

              {/* Streets and areas section */}
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="gw-heading text-base text-foreground">
                    Streets and Areas
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Area is optional
                  </span>
                </div>

                <SearchInput
                  placeholder="Search by street or area…" compactPlaceholder="Street or area…"
                  value={streetSearch}
                  onChange={setStreetSearch}
                  aria-label="Search streets and areas"
                  containerClassName="mt-2.5"
                />

                {/* Rows share the same layout as the loading state. */}
                <div className={styles.streets}>
                      <div className={styles.streetHeader}>
                        <div>Street / Area</div>
                        <div className="text-center">Active Residents</div>
                        <div className="text-center">Route Plans</div>
                        <div className="text-right">Actions</div>
                      </div>

                      <div className="divide-y divide-border/40">
                        {isLoadingStreets ? (
                          <BarangayStreetRowsSkeleton />
                        ) : streetsError ? (
                          <PageErrorState kind="unavailable" variant="section" title="Streets Couldn't Load" onRetry={() => void retryStreets()} retrying={streetsQuery.isFetching} />
                        ) : visibleStreets.length === 0 ? (
                          <ListEmptyState variant="inline" icon={Route} title="No Streets Found"
                            description={streets.length === 0
                              ? "No street records for this barangay yet."
                              : "No streets match your search."} />
                        ) : (
                          visibleStreets.map((street) => {
                            const deleteRestriction = street.account_link_count > 0
                              ? `Cannot delete: ${street.account_link_count} existing account(s) still use this street, including banned or deactivated accounts.`
                              : street.route_plan_count > 0
                                ? "Cannot delete: remove this street from its route plans first."
                                : null;
                            const displayName = street.area ? `${street.name} (${street.area})` : street.name;
                            return (
                              <div
                                key={street.id}
                                className={cn(styles.streetRow, "transition-colors hover:bg-muted/15")}
                              >
                                <div className={styles.streetName}>
                                  <span className="min-w-0 break-words text-sm font-medium text-foreground" title={displayName}>
                                    {displayName}
                                  </span>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold",
                                      street.coverage_path?.length
                                        ? badgeStyles.primary.className
                                        : badgeStyles.neutral.className,
                                    )}
                                  >
                                    {street.coverage_path?.length ? "Path saved" : "Needs path"}
                                  </span>
                                </div>

                                <div className={styles.counts}>
                                  <div className={styles.count}><span className="font-medium text-foreground">{street.active_resident_count}</span><span className={styles.countLabel}>active residents</span></div>
                                  <div className={styles.count}><span className="font-medium text-foreground">{street.route_plan_count}</span><span className={styles.countLabel}>route plans</span></div>
                                </div>

                                <div className={styles.actions}>
                                  <Button
                                    variant={street.coverage_path?.length ? "primary-ghost" : "ghost"}
                                    size="icon"
                                    className={"h-8 w-8 rounded-lg cursor-pointer"}
                                    title={street.coverage_path?.length
                                      ? `Edit coverage path${street.coverage_edit ? ` (${street.coverage_edit.points.length} pins)` : ""}`
                                      : `Draw coverage path for ${street.name}`}
                                    aria-label={`${street.coverage_path?.length ? "Edit" : "Draw"} coverage path for ${displayName}`}
                                    onClick={() => setCoverageStreet(street)}
                                  >
                                    <Route className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg cursor-pointer"
                                    title={`Edit ${street.name}`}
                                    aria-label={`Edit ${street.name}`}
                                    onClick={() => openEdit(street)}
                                  >
                                    <SquarePen className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="destructive-ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg cursor-pointer"
                                    title={`Delete ${street.name}`}
                                    aria-label={`Delete ${street.name}`}
                                    onClick={() => {
                                      if (deleteRestriction) {
                                        toast.error("Could not delete street", { description: deleteRestriction });
                                        return;
                                      }
                                      setDeletingStreet(street);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                </div>

              </div>
            </>
          )}
        </section>
      </div>

      <FormDialog
        open={editorOpen}
        onOpenChange={(open) => { if (!open) requestCloseStreetEditor(); }}
        pending={isSavingStreet}
        icon={<MapPin />}
        title={editingStreet ? "Edit street" : "Add street"}
        description={selectedBarangay ? `Street details for Barangay ${selectedBarangay.name}.` : "Enter street details."}
        footer={<>
          <Button type="button" variant="outline" onClick={requestCloseStreetEditor} disabled={isSavingStreet} className={formDialogStyles.cancelButton}>Cancel</Button>
          <Button type="submit" form="barangay-street-form" disabled={isSavingStreet} className={formDialogStyles.primaryButton} loading={isSavingStreet} loadingLabel={editingStreet ? "Saving street…" : "Adding street…"}>

            {editingStreet ? "Save Changes" : "Add Street"}
          </Button>
        </>}
      >
        <form id="barangay-street-form" onSubmit={(event) => void saveStreet(event)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="barangay-street-name" className={formDialogStyles.label}>Street Name</Label>
            <Input id="barangay-street-name" fieldSize="compact" value={streetName} onChange={(event) => { setStreetName(event.target.value); setStreetNameError(""); setFormError(""); }} maxLength={150} placeholder="e.g. Gonzales St" required autoFocus aria-invalid={Boolean(streetNameError)} aria-describedby={streetNameError ? "barangay-street-name-error" : undefined} />
            {streetNameError && <p id="barangay-street-name-error" className="text-xs text-destructive">{streetNameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="barangay-street-area" className={formDialogStyles.label}>Area <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="barangay-street-area" fieldSize="compact" value={streetArea} onChange={(event) => { setStreetArea(event.target.value); setStreetAreaError(""); setStreetNameError(""); setFormError(""); }} maxLength={100} placeholder="e.g. Ilaya, Purok 1, Zone A" aria-invalid={Boolean(streetAreaError)} aria-describedby={streetAreaError ? "barangay-street-area-error" : "barangay-street-area-hint"} />
            {streetAreaError ? <p id="barangay-street-area-error" className="text-xs text-destructive">{streetAreaError}</p> : <p id="barangay-street-area-hint" className="text-xs text-muted-foreground">Leave blank if the area has not been specified.</p>}
          </div>
          {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>}
        </form>
      </FormDialog>

      <UnsavedChangesDialog
        isOpen={editorOpen && showDiscardStreetConfirm}
        onClose={() => setShowDiscardStreetConfirm(false)}
        onDiscard={closeStreetEditor}
        title={editingStreet ? "Discard Street Changes?" : "Discard New Street?"}
        description={editingStreet
          ? "You have unsaved changes to this street. If you leave now, your edits will be lost."
          : "You have unsaved information for this new street. If you leave now, the entered street details will be discarded."}
        discardLabel={editingStreet ? "Discard Changes" : "Discard"}
        keepEditingLabel="Keep Editing"
        isSaving={isSavingStreet}
      />

      {coverageStreet && selectedBarangay && (
        <StreetCoverageEditor
          key={coverageStreet.id}
          open
          streetName={coverageStreet.area
            ? `${coverageStreet.name} (${coverageStreet.area})`
            : coverageStreet.name}
          barangayName={selectedBarangay.name}
          initialPath={coverageStreet.coverage_path ?? null}
          initialEdit={coverageStreet.coverage_edit ?? null}
          center={
            selectedBarangay.latitude !== null && selectedBarangay.longitude !== null
              ? [Number(selectedBarangay.latitude), Number(selectedBarangay.longitude)]
              : null
          }
          onOpenChange={(open) => { if (!open) setCoverageStreet(null); }}
          onSave={saveStreetCoverage}
        />
      )}

      <ConfirmationDialog
        open={Boolean(deletingStreet)}
        onOpenChange={(open) => { if (!open && !isDeletingStreet) setDeletingStreet(null); }}
        title={<>Delete {deletingStreet?.name}{deletingStreet?.area && <> ({deletingStreet.area})</>}?</>}
        icon={<Trash2 />}
        variant="destructive"
        description={<>This removes the street from Barangay {selectedBarangay?.name} and future location selections. Past collection records and their history will be preserved.</>}
        confirmLabel="Delete Street"
        isPending={isDeletingStreet}
        pendingLabel="Deleting…"
        onConfirm={() => void confirmDelete()}
      />
    </div>
    </PageRetryContext.Provider>
  );
};

export default AdminBarangays;
