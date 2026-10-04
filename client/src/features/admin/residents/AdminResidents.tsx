import { AdminFilterDialog, AdminFilterField } from "@/components/admin/AdminFilterDialog";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import PaginationControls from "@/components/common/PaginationControls";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import { profileAvatarForAccount, profileAvatarSrc } from "@/components/common/profileAvatars";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { ResidentManagerPageSkeleton, ResidentManagerProfileSkeleton, ResidentManagerRowsSkeleton } from "@/components/PageLoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminResidentManagerStyles as styles } from "@/components/communityContentStyles";

import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
Eye,
Phone,
Trash2,
Users,
UserCheck,
UserX,
Ban
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
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title="Resident Manager"
        description="View and manage all registered resident accounts across Candelaria."
      />

      {listQuery.error && <DataRefreshNotice message="Couldn't refresh residents. Showing the last loaded results, which may be outdated." onRetry={() => void listQuery.refetch()} retrying={listQuery.isFetching} />}

      {/* ── Executive Metric KPI Strip ── */}
      <AdminKpiGrid>
        {[
          {
            label: "Total Residents",
            value: kpiError || kpiLoading ? "—" : totalResidentsCount,
            tone: "neutral" as const,
            icon: Users,
            subtitle: "Registered municipal users",
          },
          {
            label: "Active Accounts",
            value: kpiError || kpiLoading ? "—" : activeCount,
            tone: "success" as const,
            icon: UserCheck,
            subtitle: "Accounts marked active",
          },
          {
            label: "Deactivated Accounts",
            value: kpiError || kpiLoading ? "—" : deactivatedCount,
            tone: "warning" as const,
            icon: UserX,
            subtitle: "Accounts marked deactivated",
          },
          {
            label: "Banned Accounts",
            value: kpiError || kpiLoading ? "—" : bannedCount,
            tone: "danger" as const,
            icon: Ban,
            subtitle: "Accounts marked banned",
          },
        ].map((kpi) => (
          <AdminKpiCard key={kpi.label} label={kpi.label} value={kpi.value} description={kpi.subtitle} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </AdminKpiGrid>

      {/* ── Resident Directory Table ── */}
      <div className={styles.directory}>
        <div className="admin-toolbar admin-toolbar-resident-controls">
          <div className={styles.toolbar}>
            <div className="min-w-0 admin-toolbar-heading">
              <h2 className="gw-heading text-base text-foreground">Resident directory</h2>
              <p className="mt-1 text-xs text-muted-foreground">Find accounts by name, contact details, or barangay.</p>
            </div>
            <div className={`${styles.fields} admin-toolbar-search-row`}>
              <SearchInput
                placeholder="Search name, username, email..."
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setCurrentPage(1);
                }}
                containerClassName={cn(styles.search, "w-full sm:w-64 lg:w-72")}
              />
              <div className="admin-toolbar-desktop-only">
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
                  className="h-9 w-full sm:w-[170px] rounded-xl text-xs"
                />
              </div>
              <AdminFilterDialog title="Filter Residents" activeCount={Number(barangayFilter !== "all")}
                values={{ barangayFilter }}
                onApply={(next) => {
                  setBarangayFilter(next.barangayFilter);
                  setCurrentPage(1);
                }}
                resetValues={{ barangayFilter: "all" }}
              >
                {(draft, setDraft) => (
                  <>
                    <AdminFilterField label="Barangay">
                      <SearchableSelect
                        value={draft.barangayFilter}
                        onValueChange={(v) => {
                          setDraft({ ...draft, barangayFilter: v });
                        }}
                        options={[{ value: "all", label: "All Barangays" }, ...barangayOptions.map((b) => ({ value: b.id, label: b.name }))]}
                        placeholder="Barangay"
                        searchPlaceholder="Search barangays..."
                        aria-label="Barangay"
                        leadingIcon={<Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        fieldSize="compact"
                        className="h-9 w-full rounded-xl text-xs"
                      />
                    </AdminFilterField>
                  </>
                )}
              </AdminFilterDialog>
            </div>
          </div>
          <div className={`${styles.filterRow} admin-toolbar-resident-chips`}>
            <FilterPillTabs
              items={STATUS_TABS}
              activeId={statusFilter}
              onChange={(id) => { setStatusFilter(id); setCurrentPage(1); }}
              className={`${styles.filters} admin-toolbar-chips`}
            />
          </div>
        </div>

        <div className={styles.list}>
          <Table className={styles.table}>
            <TableHeader className="bg-muted/20 border-b border-border/80">
              <TableRow>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 pl-5">
                  Resident
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 hidden md:table-cell">
                  Username
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 hidden lg:table-cell">
                  Email & phone
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3">
                  Barangay
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 hidden xl:table-cell">
                  Registered
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 hidden xl:table-cell">
                  Last login
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3">
                  Status
                </TableHead>
                <TableHead className="w-12 py-3 pr-5 text-right"></TableHead>
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
                      className="resident-manager-row group hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      {/* Resident name and avatar */}
                      <TableCell className="pl-5 py-3">
                        <div className="resident-manager-identity flex items-center gap-3">
                          <div className="w-9 h-9 overflow-hidden rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-xs font-body shrink-0 shadow-2xs">
                            <img src={profileAvatarSrc(profileAvatarForAccount(r.id, r.avatarUrl))} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover object-center" />
                          </div>
                          <div className="min-w-0">
                            <span className="resident-manager-resident-name font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors text-left truncate block">
                              {r.fullName}
                            </span>
                            <span className="resident-manager-inline-username text-ui-caption text-muted-foreground md:hidden truncate block mt-0.5">
                              @{r.username}
                            </span>
                          </div>
                        </div>
                        <div className={styles.mobileFooter}>
                          <span className="resident-manager-inline-barangay flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="min-w-0">{r.barangay}</span>
                          </span>
                          <Badge variant="outline" className={`resident-manager-account-badge shrink-0 text-ui-caption font-semibold rounded-md px-2.5 py-0.5 ${residentStatusStyles[r.status] || residentStatusStyles.Active}`}>
                            {r.status}
                          </Badge>
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
                        <div className="inline-flex max-w-full items-center gap-1.5 text-muted-foreground">
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
                          className={`resident-manager-account-badge text-ui-caption font-semibold rounded-md px-2.5 py-0.5 ${
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
                              aria-label={`Actions for ${r.fullName}`}
                              className="resident-manager-menu h-8 w-8 rounded-lg opacity-70 group-hover:opacity-100 cursor-pointer transition-opacity"
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
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void toggleStatus(r)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              {r.status === "Active" ? (
                                <UserX className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              ) : (
                                <UserCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              )}
                              {r.status === "Active" ? "Deactivate" : r.status === "Banned" ? "Unban" : "Reactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(r)}
                              className="text-xs cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
                            >
                              <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
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
          <PaginationControls mobileLayout="summary"
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
