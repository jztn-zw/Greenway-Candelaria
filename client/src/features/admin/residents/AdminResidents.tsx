import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import PaginationControls from "@/components/common/PaginationControls";
import { profileAvatarForAccount, profileAvatarSrc } from "@/components/common/profileAvatars";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { ResidentManagerPageSkeleton, ResidentManagerProfileSkeleton, ResidentManagerRowsSkeleton } from "@/components/PageLoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { useAdminMutation, useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import {
deleteResident as apideleteResidentAccount,
updateResidentStatus as apiupdateResidentStatus,
fetchResidentById,
fetchResidentReports,
fetchResidents,
type ResidentAccountStatus,
} from "@/services/residentManagerService";
import {
Filter,
Mail,
MapPin,
MoreHorizontal,
Phone,
Search,
Trash2,
Users,
X
} from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mapResidentDetails, mapResidentListRow } from "./residentManager.utils";
import ResidentProfileView from "./ResidentProfile";
import type { Resident } from "./types";

const ITEMS_PER_PAGE = 10;
const residentStatusStyles: Record<string, string> = {
  Active:
    getStatusBadgeStyle("Active").className,
  Deactivated:
    getStatusBadgeStyle("Deactivated").className,
  Banned:
    getStatusBadgeStyle("Banned").className,
};

const AdminResidents = () => {
  const deleteResidentAccount = useAdminMutation(apideleteResidentAccount, "residents", "reports");
  const updateResidentStatus = useAdminMutation(apiupdateResidentStatus, "residents", "reports");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResidentsCount, setTotalResidentsCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [deactivatedCount, setDeactivatedCount] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const [kpiError, setKpiError] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [barangayOptions, setBarangayOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const residentProfileId = searchParams.get("residentId");

  const listQuery = useAdminQuery("residents", ["list", search.trim(), barangayFilter, statusFilter, currentPage], () => fetchResidents({
    search: search.trim() || undefined, barangay_id: barangayFilter === "all" ? undefined : barangayFilter,
    status: statusFilter === "all" ? undefined : statusFilter as ResidentAccountStatus,
    page: currentPage, limit: ITEMS_PER_PAGE,
  }));
  const countQuery = useAdminQuery("residents", ["counts"], () => Promise.all([
    fetchResidents({ page: 1, limit: 1 }), fetchResidents({ page: 1, limit: 1, status: "ACTIVE" }),
    fetchResidents({ page: 1, limit: 1, status: "DEACTIVATED" }), fetchResidents({ page: 1, limit: 1, status: "BANNED" }),
  ]));
  const barangaysQuery = useAdminQuery("barangays", ["admin-options"], fetchBarangaysAdmin);
  const detailQuery = useAdminQuery("residents", ["detail", residentProfileId], async () => {
    const [details, reports] = await Promise.all([fetchResidentById(residentProfileId!), fetchResidentReports(residentProfileId!)]);
    return mapResidentDetails(details, reports);
  }, { enabled: !!residentProfileId });
  const isLoading = listQuery.isLoading;
  const isInitialLoading = isLoading && !hasLoadedList;
  const isResultsLoading = isLoading && hasLoadedList;
  const listError = listQuery.data ? "" : listQuery.error?.message ?? "";
  const loadResidents = listQuery.refetch;
  const loadKpiCounts = countQuery.refetch;
  useLayoutEffect(() => {
    const result = listQuery.data;
    if (!result) return;
    setResidents(result.data.map(mapResidentListRow));
    setTotalPages(Math.max(1, Number(result.pagination?.total_pages || 1)));
    setHasLoadedList(true);
  }, [listQuery.data]);
  useEffect(() => {
    setKpiLoading(countQuery.isLoading); setKpiError(countQuery.isError);
    if (!countQuery.data) return;
    const [all, active, deactivated, banned] = countQuery.data;
    setTotalResidentsCount(Number(all.pagination?.total || 0)); setActiveCount(Number(active.pagination?.total || 0));
    setDeactivatedCount(Number(deactivated.pagination?.total || 0)); setBannedCount(Number(banned.pagination?.total || 0));
  }, [countQuery.data, countQuery.isLoading, countQuery.isError]);
  useEffect(() => { setBarangayOptions((barangaysQuery.data ?? []).map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))); }, [barangaysQuery.data]);
  useLayoutEffect(() => { setViewingResident(residentProfileId ? detailQuery.data ?? null : null); }, [residentProfileId, detailQuery.data]);
  useEffect(() => {
    if (!detailQuery.error) return;
    toast.error(detailQuery.error.message);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("residentId"); next.delete("residentName"); return next; });
  }, [detailQuery.error, setSearchParams]);

  const toggleStatus = async (resident: Resident) => {
    try {
      const newStatus = resident.status === "Active" ? "DEACTIVATED" : "ACTIVE";
      await updateResidentStatus(resident.id, newStatus);
      const action = newStatus === "DEACTIVATED"
        ? "deactivated"
        : resident.status === "Banned" ? "unbanned" : "reactivated";
      toast.success(`${resident.fullName} ${action}`);
      if (viewingResident && viewingResident.id === resident.id) {
        setViewingResident({
          ...viewingResident,
          status: newStatus === "ACTIVE" ? "Active" : "Deactivated",
          banReason: newStatus === "ACTIVE" ? null : viewingResident.banReason,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update resident status.",
      );
    }
  };

  const deleteResident = async () => {
    if (!deleteTarget) return;
    try {
      await deleteResidentAccount(deleteTarget.id);
      toast.success(`${deleteTarget.fullName} removed from the manager`);
      setDeleteTarget(null);
      if (residents.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete resident.",
      );
    }
  };

  const openResidentProfile = (resident: Resident) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("residentId", resident.id);
      next.set("residentName", resident.fullName);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch("");
    setBarangayFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    barangayFilter !== "all" ||
    statusFilter !== "all";

  if (residentProfileId && viewingResident?.id === residentProfileId) {
    return (
      <ResidentProfileView
        resident={viewingResident}
        onToggleStatus={toggleStatus}
      />
    );
  }

  if (residentProfileId) {
    return <ResidentManagerProfileSkeleton />;
  }

  if (isInitialLoading) {
    return <ResidentManagerPageSkeleton />;
  }
  if (listError) return <PageErrorState kind="unavailable" description="We couldn't load residents. Please try again." onRetry={() => void listQuery.refetch()} retrying={listQuery.isFetching} homeHref="/admin" />;

  const STATUS_TABS: FilterPillItem[] = [
    { id: "all", label: "All Residents", count: kpiError || kpiLoading ? undefined : totalResidentsCount },
    { id: "ACTIVE", label: "Active", count: kpiError || kpiLoading ? undefined : activeCount },
    { id: "DEACTIVATED", label: "Deactivated", count: kpiError || kpiLoading ? undefined : deactivatedCount },
    { id: "BANNED", label: "Banned", count: kpiError || kpiLoading ? undefined : bannedCount },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
            Resident Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View and manage all registered resident accounts across Candelaria.
          </p>
        </div>

      </div>

      {listQuery.error && <DataRefreshNotice message="Couldn't refresh residents. Showing the last loaded results, which may be outdated." onRetry={() => void listQuery.refetch()} retrying={listQuery.isFetching} />}

      {/* ── Executive Metric KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        {[
          {
            label: "Total Residents",
            value: kpiError || kpiLoading ? "—" : totalResidentsCount,
            tag: "bg-muted/70 text-muted-foreground border-border/80",
            subtitle: "Registered municipal users",
          },
          {
            label: "Active Accounts",
            value: kpiError || kpiLoading ? "—" : activeCount,
            tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            subtitle: "Accounts marked active",
          },
          {
            label: "Deactivated Accounts",
            value: kpiError || kpiLoading ? "—" : deactivatedCount,
            tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            subtitle: "Accounts marked deactivated",
          },
          {
            label: "Banned Accounts",
            value: kpiError || kpiLoading ? "—" : bannedCount,
            tag: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
            subtitle: "Accounts marked banned",
          },
        ].map((kpi, idx) => (
          <div
            key={kpi.label}
            className={cn(
              "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
              idx % 2 === 0 ? "sm:border-r border-border/70 xl:border-r-0" : "",
              idx < 3 ? "xl:border-r xl:border-border/70" : "xl:border-r-0",
              idx < 2 ? "border-b xl:border-b-0 border-border/70" : ""
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

      {/* ── Resident Directory Table ── */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
        {/* ── Integrated Single-Row Toolbar ── */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 bg-card">
          {/* Left: Status Pill Tabs */}
          <FilterPillTabs
            items={STATUS_TABS}
            activeId={statusFilter}
            onChange={(id) => { setStatusFilter(id); setCurrentPage(1); }}
            className="shrink-0 xl:pb-0"
          />

          {/* Right: Search + Barangay Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 xl:justify-end min-w-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, username, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 pl-9 pr-8 bg-background rounded-xl border-border/80 text-xs focus-visible:ring-primary/20"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="gw-action-ghost absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 rounded-md"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Barangay Select */}
            <SearchableSelect
              value={barangayFilter}
              onValueChange={(v) => {
                setBarangayFilter(v);
                setCurrentPage(1);
              }}
              options={[{ value: "all", label: "All Barangays" }, ...barangayOptions.map((b) => ({ value: b.id, label: b.name }))]}
              placeholder="Barangay"
              searchPlaceholder="Search barangays..."
              aria-label="Barangay"
              leadingIcon={<Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              fieldSize="compact"
              className="h-9 w-full sm:w-[170px] bg-background border-border/80 rounded-xl text-xs font-semibold"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/80">
              <TableRow>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5 pl-5">
                  Resident
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5 hidden md:table-cell">
                  Username
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5 hidden lg:table-cell">
                  Email & Phone
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5">
                  Barangay
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5 hidden xl:table-cell">
                  Registered
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5 hidden xl:table-cell">
                  Last Login
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3.5">
                  Status
                </TableHead>
                <TableHead className="w-12 py-3.5 pr-5 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isResultsLoading ? (
                <ResidentManagerRowsSkeleton />
              ) : residents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        No Residents Found
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {hasActiveFilters
                          ? "No residents match your active filter or search query. Try adjusting your filters."
                          : "No residents have been registered yet."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                residents.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => openResidentProfile(r)}
                      className="group hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      {/* Resident name and avatar */}
                      <TableCell className="pl-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 overflow-hidden rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-xs font-body shrink-0 shadow-2xs">
                            <img src={profileAvatarSrc(profileAvatarForAccount(r.id, r.avatarUrl))} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover object-center" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors text-left truncate block">
                              {r.fullName}
                            </span>
                            <span className="text-ui-caption text-muted-foreground md:hidden truncate block mt-0.5">
                              @{r.username}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Username */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-medium">
                        @{r.username}
                      </TableCell>

                      {/* Email & Phone */}
                      <TableCell className="hidden lg:table-cell text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{r.email}</span>
                          </div>
                          {r.phone !== "N/A" && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-ui-caption">
                              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{r.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Barangay */}
                      <TableCell className="text-xs">
                        <div className="inline-flex items-center gap-1 text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {r.barangay}
                          </span>
                        </div>
                      </TableCell>

                      {/* Date Registered */}
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {r.dateRegistered}
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {r.lastLogin}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-ui-caption font-semibold rounded-md px-2.5 py-0.5 ${
                            residentStatusStyles[r.status] ||
                            residentStatusStyles.Active
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>

                      {/* 3-Dot Action Menu */}
                      <TableCell
                        className="pr-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg opacity-70 group-hover:opacity-100 cursor-pointer transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl shadow-lg border border-border/80 w-40 p-1"
                          >
                            <DropdownMenuItem
                              onClick={() => openResidentProfile(r)}
                              className="text-xs cursor-pointer"
                            >
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void toggleStatus(r)}
                              className="text-xs cursor-pointer"
                            >
                              {r.status === "Active" ? "Deactivate" : r.status === "Banned" ? "Unban" : "Reactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(r)}
                              className="text-xs cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Table Pagination Bar ── */}
        {!isResultsLoading && !listError && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            variant="table"
          />
        )}
      </div>

      {/* ── Delete Resident Confirmation Modal ── */}
      <ConfirmationDialog
        kind="dialog"
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Resident Account?"
        icon={<Trash2 />}
        variant="destructive"
        description={<>Remove <strong className="font-semibold text-foreground">{deleteTarget?.fullName}</strong>&apos;s account (@{deleteTarget?.username}) from the manager? The account will be disabled and hidden; existing reports remain on record.</>}
        confirmLabel="Remove Account"
        onConfirm={deleteResident}
        pendingLabel="Removing account…"
      />
    </div>
  );
};

export default AdminResidents;
