import ListEmptyState from "@/components/common/ListEmptyState";
import { AdminFilterDialog,AdminFilterField } from "@/components/admin/AdminFilterDialog";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { AdminConfirmationDialog as ConfirmationDialog } from "@/components/admin/AdminModal";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import PaginationControls from "@/components/common/PaginationControls";
import { AdminKpiCard,AdminKpiGrid,AdminKpiSkeleton } from "@/components/admin/AdminKpiCards";
import { profileAvatarForAccount,profileAvatarImageSrc } from "@/components/common/profileAvatars";
import { FilterPillTabs,type FilterPillItem } from "@/components/common/FilterPillTabs";
import { ResidentManagerPageSkeleton,ResidentManagerProfileSkeleton,ResidentManagerRowsSkeleton } from "@/components/loading/PageLoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminResidentManagerStyles as styles } from "@/components/common/communityContentStyles";

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
import { useAdminMutation,useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import {
deleteResident as apideleteResidentAccount,
updateResidentStatus as apiupdateResidentStatus,
fetchResidentById,
fetchResidentReports,
fetchResidents,
fetchDeletedResidentCount,
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
import { useEffect,useLayoutEffect,useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mapResidentDetails,mapResidentListRow } from "./residentManager.utils";
import ResidentProfileView from "./ResidentProfile";
import ResidentBanDialog from "./ResidentBanDialog";
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
  const [deletedCount, setDeletedCount] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const [kpiError, setKpiError] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [barangayOptions, setBarangayOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [statusTarget, setStatusTarget] = useState<Resident | null>(null);
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
    fetchResidents({ page: 1, limit: 1, status: "BANNED" }),
    fetchDeletedResidentCount(),
  ]));
  const barangaysQuery = useAdminQuery("barangays", ["admin-options"], fetchBarangaysAdmin);
  const detailQuery = useAdminQuery("residents", ["detail", residentProfileId], async () => {
    const [details, reports] = await Promise.all([fetchResidentById(residentProfileId!), fetchResidentReports(residentProfileId!)]);
    return mapResidentDetails(details, reports);
  }, { enabled: !!residentProfileId });
  const isLoading = listQuery.isLoading;
  const isInitialLoading = isLoading && !hasLoadedList;
  const isResultsLoading = isLoading && hasLoadedList;
  const listError = listQuery.data ? "" : listQuery.error?.message ?? "";useLayoutEffect(() => {
    const result = listQuery.data;
    if (!result) return;
    setResidents(result.data.map(mapResidentListRow));
    setTotalPages(Math.max(1, Number(result.pagination?.total_pages || 1)));
    setHasLoadedList(true);
  }, [listQuery.data]);
  useEffect(() => {
    setKpiLoading(countQuery.isLoading); setKpiError(countQuery.isError);
    if (!countQuery.data) return;
    const [all, active, banned, deleted] = countQuery.data;
    setTotalResidentsCount(Number(all.pagination?.total || 0)); setActiveCount(Number(active.pagination?.total || 0));
    setBannedCount(Number(banned.pagination?.total || 0));
    setDeletedCount(deleted);
  }, [countQuery.data, countQuery.isLoading, countQuery.isError]);
  useEffect(() => { setBarangayOptions((barangaysQuery.data ?? []).map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))); }, [barangaysQuery.data]);
  useLayoutEffect(() => { setViewingResident(residentProfileId ? detailQuery.data ?? null : null); }, [residentProfileId, detailQuery.data]);
  useEffect(() => {
    if (!detailQuery.error) return;
    toast.error(detailQuery.error.message);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("residentId"); next.delete("residentName"); return next; });
  }, [detailQuery.error, setSearchParams]);

  const openStatusConfirmation = (resident: Resident) => {
    if (resident.status !== "Deactivated") setStatusTarget(resident);
  };
  const confirmStatusChange = async (resident: Resident, reason?: string) => {
    const newStatus = resident.status === "Banned" ? "ACTIVE" : "BANNED";
    const updated = await updateResidentStatus(resident.id, newStatus, reason);
    const patch = { status: updated.status === "BANNED" ? "Banned" as const : "Active" as const, banReason: updated.ban_reason };
    setResidents((previous) => previous.map((item) => item.id === resident.id ? { ...item, ...patch } : item));
    setViewingResident((previous) => previous?.id === resident.id ? { ...previous, ...patch } : previous);
    toast.success(`${resident.fullName} ${newStatus === "BANNED" ? "banned" : "unbanned"}`);
  };
  const statusDialog = statusTarget && <ResidentBanDialog
    key={`${statusTarget.id}:${statusTarget.status}`} resident={statusTarget}
    onClose={() => setStatusTarget(null)} onConfirm={confirmStatusChange} />;

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
  };  const hasActiveFilters =
    search.trim().length > 0 ||
    barangayFilter !== "all" ||
    statusFilter !== "all";

  if (residentProfileId && viewingResident?.id === residentProfileId) {
    return (
      <><ResidentProfileView
        resident={viewingResident}
        onToggleStatus={openStatusConfirmation}
      />{statusDialog}</>
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
    { id: "BANNED", label: "Banned", count: kpiError || kpiLoading ? undefined : bannedCount },
  ];

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title="Resident Management"
        description="View and manage all registered resident accounts across Candelaria."
      />

      {listQuery.error && <DataRefreshNotice message="Couldn't refresh residents. Showing the last loaded results, which may be outdated." onRetry={() => void listQuery.refetch()} retrying={listQuery.isFetching} />}

      {/* ── Executive Metric KPI Strip ── */}
      {kpiLoading ? <AdminKpiSkeleton /> : <AdminKpiGrid>
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
            label: "Deleted Accounts",
            value: kpiError || kpiLoading ? "—" : deletedCount,
            tone: "warning" as const,
            icon: UserX,
            subtitle: "Accounts removed from the directory",
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
      </AdminKpiGrid>}

      {/* ── Resident Directory Table ── */}
      <div className={styles.directory}>
        <div className="admin-toolbar admin-toolbar-resident-controls">
          <div className={styles.toolbar}>
            <div className="min-w-0 admin-toolbar-heading">
              <h2 className="gw-heading text-base text-foreground">Resident Directory</h2>
              <p className="mt-1 text-xs text-muted-foreground">Find accounts by name, contact details, or barangay.</p>
            </div>
            <div className={`${styles.fields} admin-toolbar-search-row`}>
              <SearchInput
                placeholder="Search by name, username, or email…" compactPlaceholder="Name, username, or email…"
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
                  searchPlaceholder="Search by barangay name…" compactSearchPlaceholder="Barangay name…"
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
                        searchPlaceholder="Search by barangay name…" compactSearchPlaceholder="Barangay name…"
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
                  Email & Phone
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3">
                  Barangay
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 hidden xl:table-cell">
                  Registered
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground py-3 hidden xl:table-cell">
                  Last Login
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
                    className="!p-0"
                  >
                    <ListEmptyState variant="inline" icon={Users} title="No Residents Found"
                      description={hasActiveFilters
                          ? "No residents match your active filter or search query. Try adjusting your filters."
                          : "No residents have been registered yet."} />
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
                            <img src={profileAvatarImageSrc(profileAvatarForAccount(r.id, r.avatarUrl))} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover object-center" />
                          </div>
                          <div className="min-w-0">
                            <span className="resident-manager-resident-name font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors text-left truncate block">
                              {r.fullName}
                            </span>
                            {r.profileCompleted === false && <Badge variant="outline" className="mt-1 text-ui-caption text-muted-foreground">Profile Incomplete</Badge>}
                            <span className="resident-manager-inline-username text-ui-caption text-muted-foreground md:hidden truncate block mt-0.5">
                              {r.username ? `@${r.username}` : "Username not set"}
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
                        {r.username ? `@${r.username}` : "Username not set"}
                      </TableCell>

                      {/* Email & Phone */}
                      <TableCell className="hidden lg:table-cell text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground/90 truncate">
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{r.email || (r.phone === "N/A" ? "No email or phone added" : "No email added")}</span>
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
                            {r.status !== "Deactivated" && <DropdownMenuItem
                              onClick={() => openStatusConfirmation(r)}
                              className={`text-xs cursor-pointer gap-2 ${r.status === "Active" ? "text-destructive focus:bg-destructive/10 focus:text-destructive" : ""}`}
                            >
                              {r.status === "Active" ? (
                                <Ban className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                              ) : (
                                <UserCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              )}
                              {r.status === "Active" ? "Ban Resident" : "Unban Resident"}
                            </DropdownMenuItem>}
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

      {statusDialog}
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
