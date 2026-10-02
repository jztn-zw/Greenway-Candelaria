import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { PageRetryContext } from "@/components/pageRetryContext";
import { FormDialog } from "@/components/FormDialog";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { BarangayManagerPageSkeleton, BarangayStreetRowsSkeleton } from "@/components/PageLoadingSkeletons";

import { Button } from "@/components/ui/button";
import { formDialogStyles } from "@/components/formDialogStyles";
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
} from "@/services/barangaysService";
import { Loader2, MapPin, Pencil, Plus, Route, Search, Trash2, Truck } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import StreetCoverageEditor, { type CoveragePoint } from "./StreetCoverageEditor";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

const AdminBarangays = () => {
  const createBarangayStreet = useAdminMutation(apicreateBarangayStreet, "barangays", "routes", "tracking", "schedule");
  const deleteBarangayStreet = useAdminMutation(apideleteBarangayStreet, "barangays", "routes", "tracking", "schedule");
  const updateBarangayCollectionService = useAdminMutation(apiupdateBarangayCollectionService, "barangays", "routes", "tracking", "schedule");
  const updateBarangayStreet = useAdminMutation(apiupdateBarangayStreet, "barangays", "routes", "tracking", "schedule");
  const updateBarangayStreetCoverage = useAdminMutation(apiupdateBarangayStreetCoverage, "barangays", "routes", "tracking", "schedule");
  const streetTableGridClass = "grid grid-cols-[minmax(8rem,1fr)_6.5rem_6.5rem_7.5rem]";
  const [selectedId, setSelectedId] = useState("");
  const selectedIdRef = useRef("");
  const [search, setSearch] = useState("");
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
    if (!overviewQuery.data.length) return;
    setSelectedId((current) => current && barangays.some((row) => row.id === current) ? current
      : barangays.find((row) => row.name.toLowerCase() === "poblacion")?.id ?? barangays[0]?.id ?? "");
  }, [overviewQuery.data, barangays]);
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
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Service Available",
      value: barangayMetricsAvailable ? serviceCount : "—",
      subtitle: barangayMetricsAvailable
        ? totalBarangays > 0
          ? `${serviceAvailabilityRate}% of barangays (${serviceCount} of ${totalBarangays})`
          : "No barangays to measure"
        : unavailableMetricSubtitle,
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Service Unavailable",
      value: barangayMetricsAvailable ? noServiceCount : "—",
      subtitle: barangayMetricsAvailable
        ? totalBarangays > 0 ? "Collection service marked unavailable" : "No barangays to measure"
        : unavailableMetricSubtitle,
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Street Records",
      value: barangayMetricsAvailable ? totalStreets : "—",
      subtitle: barangayMetricsAvailable
        ? totalStreets > 0
          ? `${streetsWithPath} of ${totalStreets} have a saved coverage path`
          : "No street records"
        : unavailableMetricSubtitle,
      tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
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
      toast.error(errorMessage(error));
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
      toast.error(errorMessage(error));
    } finally {
      setIsDeletingStreet(false);
    }
  };

  const saveStreetCoverage = async (path: CoveragePoint[] | null) => {
    if (!coverageStreet) return;
    const barangayId = coverageStreet.barangay_id;
    if (!barangayId) return;
    setIsSavingCoverage(true);
    try {
      await updateBarangayStreetCoverage(barangayId, coverageStreet.id, path);
      setStreets((current) => current.map((street) =>
        street.id === coverageStreet.id ? { ...street, coverage_path: path } : street,
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
            Barangay Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage municipal barangays, street records, and collection service availability.
          </p>
        </div>
      </div>

      {(overviewQuery.error || streetsQuery.error) && <DataRefreshNotice primary message="Some barangay or street information couldn't load or refresh. Available information is still shown; previously loaded data may be outdated." onRetry={() => { if (overviewQuery.error) void retryOverview(); if (streetsQuery.error) void retryStreets(); }} retrying={overviewQuery.isFetching || streetsQuery.isFetching} />}

      {/* ── Executive Metric KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className={cn(
              "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
              idx % 2 === 0 ? "border-r border-border/70" : "",
              idx < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
              idx < 2 ? "border-b lg:border-b-0 border-border/70" : ""
            )}
          >
            <div className="flex items-center min-h-[22px]">
              <span
                className={cn(
                  "text-ui-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                  kpi.tag
                )}
              >
                {kpi.label}
              </span>
            </div>

            <div className="gw-stat-value text-2xl sm:text-3xl text-foreground tracking-tight tabular-nums">
              {kpi.value.toLocaleString()}
            </div>

            <div className="text-ui-caption text-muted-foreground font-medium truncate">
              {kpi.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Two-Column Layout matching Reference Mockup ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-5 items-start">
        {/* ── Left Column: Barangays Card ── */}
        <aside className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col">
          <h2 className="gw-heading text-xl tracking-tight text-foreground">
            Barangays
          </h2>

          <div className="relative mt-3.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search barangays"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search barangays..."
              className="h-10 pl-9 rounded-xl bg-muted/20 border-border/70 text-sm focus-visible:ring-emerald-500"
            />
          </div>

          <div className="mt-4 space-y-2 max-h-[calc(100vh-27rem)] min-h-[26rem] overflow-y-auto pr-1">
            {isLoadingBarangays ? (
              <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading barangays…
              </p>
            ) : visibleBarangays.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No barangays found.
              </p>
            ) : (
              visibleBarangays.map((barangay) => {
                const isSelected = selectedId === barangay.id;
                return (
                  <button
                    key={barangay.id}
                    type="button"
                    onClick={() => selectBarangay(barangay.id)}
                    disabled={isSavingStreet || isDeletingStreet || isSavingAvailability || isSavingCoverage}
                    className={cn(
                      "w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all border cursor-pointer",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-xs"
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
                      <p className="truncate text-sm font-semibold text-foreground leading-snug">
                        {barangay.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {barangay.street_count} {barangay.street_count === 1 ? "street" : "streets"} •{" "}
                        {barangay.collection_service_available
                              ? "Service marked available"
                              : "Service marked unavailable"}
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
        <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col">
          {!selectedBarangay ? (
            <div className="p-16 text-center text-sm text-muted-foreground">
              Select a barangay to view its streets.
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="gw-heading text-2xl tracking-tight text-foreground">
                    Barangay {selectedBarangay.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedBarangay.street_count} {selectedBarangay.street_count === 1 ? "street" : "streets"} on record
                  </p>
                </div>

                <Button
                  onClick={openCreate}
                  className="h-10 rounded-xl font-medium px-4 gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" /> Add street
                </Button>
              </div>

              {/* Truck Collection Service Banner */}
              <div className="mt-5 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-4.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-success-foreground shrink-0">
                    <Truck className="w-6 h-6 text-success-foreground" />
                  </div>
                  <div>
                    <Label
                      htmlFor="collection-service"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Truck collection service
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
                  className="data-[state=checked]:bg-emerald-500"
                  aria-label={`Collection service for ${selectedBarangay.name}`}
                />
              </div>

              {/* Streets and areas section */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="gw-heading text-base text-foreground">
                    Streets and areas
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Area is optional
                  </span>
                </div>

                <div className="relative mt-2.5">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    aria-label="Search streets and areas"
                    value={streetSearch}
                    onChange={(event) => setStreetSearch(event.target.value)}
                    placeholder="Search streets or areas..."
                    className="h-10 pl-10 rounded-xl bg-muted/20 border-border/70 text-sm focus-visible:ring-emerald-500"
                  />
                </div>

                {/* Streets Table with fixed header and scroll limited below header line */}
                <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
                  <div className="overflow-x-auto">
                    <div className="min-w-[485px]">
                      {/* Fixed Header Row (outside scroll) */}
                      <div className={cn(streetTableGridClass, "items-center border-b border-border/70 bg-card pl-3 pr-[17px] py-3 text-ui-caption font-bold uppercase tracking-wider text-muted-foreground")}>
                        <div className="text-left">STREET / AREA</div>
                        <div className="flex w-full items-center justify-center text-center leading-tight">ACTIVE RESIDENTS</div>
                        <div className="flex w-full items-center justify-center text-center leading-tight">ROUTE PLANS</div>
                        <div className="flex w-full items-center justify-center text-center leading-tight">ACTIONS</div>
                      </div>

                      {/* Scrollable Rows Container (scroll limited below the header line, max ~10 rows) */}
                      <div className="max-h-[30rem] overflow-y-auto [scrollbar-gutter:stable] divide-y divide-border/40 scrollbar-thin">
                        {isLoadingStreets ? (
                          <BarangayStreetRowsSkeleton />
                        ) : streetsError ? (
                          <PageErrorState kind="unavailable" variant="section" title="Streets couldn't load" onRetry={() => void retryStreets()} retrying={streetsQuery.isFetching} />
                        ) : visibleStreets.length === 0 ? (
                          <div className="py-12 text-center text-xs text-muted-foreground">
                            {streets.length === 0
                              ? "No street records for this barangay yet."
                              : "No streets match your search."}
                          </div>
                        ) : (
                          visibleStreets.map((street) => {
                            const inUse = street.account_link_count + street.route_plan_count + street.route_run_record_count > 0;
                            const displayName = street.area ? `${street.name} (${street.area})` : street.name;
                            return (
                              <div
                                key={street.id}
                                className={cn(streetTableGridClass, "items-center py-2.5 px-3 transition-colors hover:bg-muted/15")}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <span className="text-sm font-medium text-foreground truncate" title={displayName}>
                                    {displayName}
                                  </span>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold",
                                      street.coverage_path?.length
                                        ? "border-primary/20 bg-primary/10 text-primary"
                                        : "border-border/70 bg-muted/30 text-muted-foreground",
                                    )}
                                  >
                                    {street.coverage_path?.length ? "Path saved" : "Needs path"}
                                  </span>
                                </div>

                                <div className="flex w-full items-center justify-center text-center text-sm font-medium tabular-nums text-foreground/90">
                                  {street.active_resident_count}
                                </div>

                                <div className="flex w-full items-center justify-center text-center text-sm font-medium tabular-nums text-foreground/90">
                                  {street.route_plan_count}
                                </div>

                                <div className="flex w-full items-center justify-center gap-1">
                                  <Button
                                    variant={street.coverage_path?.length ? "primary-ghost" : "ghost"}
                                    size="icon"
                                    className={"h-8 w-8 rounded-lg cursor-pointer"}
                                    title={street.coverage_path?.length
                                      ? `Edit coverage path (${street.coverage_path.length} points)`
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
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="destructive-ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg cursor-pointer"
                                    title={
                                      inUse
                                        ? "Cannot delete: linked to an account or route record"
                                        : `Delete ${street.name}`
                                    }
                                    aria-label={`Delete ${street.name}`}
                                    disabled={inUse}
                                    onClick={() => setDeletingStreet(street)}
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
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Streets linked to user accounts, route plans, or saved route runs can be renamed but cannot be deleted.
                </p>
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

            {editingStreet ? "Save changes" : "Add street"}
          </Button>
        </>}
      >
        <form id="barangay-street-form" onSubmit={(event) => void saveStreet(event)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="barangay-street-name" className={formDialogStyles.label}>Street name</Label>
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
        description={<>This removes the street from Barangay {selectedBarangay?.name}. Streets linked to user accounts, route plans, or saved route runs cannot be deleted.</>}
        confirmLabel="Delete street"
        isPending={isDeletingStreet}
        pendingLabel="Deleting…"
        onConfirm={() => void confirmDelete()}
      />
    </div>
    </PageRetryContext.Provider>
  );
};

export default AdminBarangays;
