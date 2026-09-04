import { useState, useEffect, useRef } from "react";
import {
  Search,
  Download,
  Eye,
  Trash2,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  X,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Resident, ResidentReport } from "./types";
import ResidentProfileView from "./ResidentProfile";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
} from "@/components/PageLoadingSkeletons";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import {
  deleteResident as deleteResidentAccount,
  fetchResidentById,
  fetchResidentReports,
  fetchResidents,
  updateResidentStatus,
  type ResidentAccountStatus,
} from "@/services/residentManagerService";
import { mapResidentDetails, mapResidentListRow } from "./residentManager.utils";

const ITEMS_PER_PAGE = 10;

const residentStatusStyles: Record<string, string> = {
  Active:
    "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  Deactivated:
    "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
  Banned:
    "bg-background/95 dark:bg-zinc-900/90 text-rose-700 dark:text-rose-300 border-rose-500/40 dark:border-rose-400/40 backdrop-blur-md shadow-2xs",
};

const AdminResidents = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResidentsCount, setTotalResidentsCount] = useState(0);
  const [filteredResidentsCount, setFilteredResidentsCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [deactivatedCount, setDeactivatedCount] = useState(0);
  const [barangayOptions, setBarangayOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);

  const requestSeq = useRef(0);

  const loadResidents = async () => {
    const seq = ++requestSeq.current;
    const normalizedSearch = search.trim();

    try {
      const result = await fetchResidents({
        search: normalizedSearch || undefined,
        barangay_id: barangayFilter === "all" ? undefined : barangayFilter,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as ResidentAccountStatus),
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      if (seq !== requestSeq.current) return;

      setResidents((result.data || []).map(mapResidentListRow));
      setTotalPages(Math.max(1, Number(result.pagination?.total_pages || 1)));
      setFilteredResidentsCount(Number(result.pagination?.total || 0));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      toast.error(
        err instanceof Error ? err.message : "Failed to load residents.",
      );
      setResidents([]);
      setTotalPages(1);
      setFilteredResidentsCount(0);
    }
  };

  const loadKpiCounts = async () => {
    try {
      const [allRes, activeRes, deactivatedRes, bannedRes] = await Promise.all([
        fetchResidents({ page: 1, limit: 1 }),
        fetchResidents({ page: 1, limit: 1, status: "ACTIVE" }),
        fetchResidents({ page: 1, limit: 1, status: "DEACTIVATED" }),
        fetchResidents({ page: 1, limit: 1, status: "BANNED" }),
      ]);

      setTotalResidentsCount(Number(allRes.pagination?.total || 0));
      setActiveCount(Number(activeRes.pagination?.total || 0));
      setDeactivatedCount(
        Number(deactivatedRes.pagination?.total || 0) +
          Number(bannedRes.pagination?.total || 0),
      );
    } catch {
      // Keep UI running even if KPI fetch fails.
    }
  };

  const toggleStatus = async (resident: Resident) => {
    try {
      const newStatus = resident.status === "Active" ? "DEACTIVATED" : "ACTIVE";
      await updateResidentStatus(resident.id, newStatus);
      toast.success(
        `${resident.fullName} ${newStatus === "ACTIVE" ? "reactivated" : "deactivated"}`,
      );
      await Promise.all([loadResidents(), loadKpiCounts()]);
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
      toast.success(`${deleteTarget.fullName} deleted successfully`);
      setDeleteTarget(null);
      if (residents.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await loadResidents();
      }
      await loadKpiCounts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete resident.",
      );
    }
  };

  const openResidentProfile = async (residentId: string) => {
    try {
      const [residentDetails, residentReports] = await Promise.all([
        fetchResidentById(residentId),
        fetchResidentReports(residentId),
      ]);
      setViewingResident(mapResidentDetails(residentDetails, residentReports));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load resident profile.",
      );
    }
  };

  const exportCSV = async () => {
    try {
      const result = await fetchResidents({
        search: search || undefined,
        barangay_id: barangayFilter === "all" ? undefined : barangayFilter,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as ResidentAccountStatus),
        page: 1,
        limit: 10000,
      });
      const exportRows = (result.data || []).map(mapResidentListRow);

      const headers = [
        "Full Name",
        "Username",
        "Email",
        "Barangay",
        "Date Registered",
        "Last Login",
        "Status",
      ];
      const rows = exportRows.map((r) => [
        r.fullName,
        r.username,
        r.email,
        r.barangay,
        r.dateRegistered,
        r.lastLogin,
        r.status,
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${c}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "residents.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export CSV.",
      );
    }
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

  useEffect(() => {
    let mounted = true;
    const loadFilters = async () => {
      try {
        const rows = await fetchBarangaysAdmin();
        if (!mounted) return;
        const options = rows
          .map((row) => ({ id: row.id, name: row.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setBarangayOptions(options);
      } catch {
        if (mounted) setBarangayOptions([]);
      }
    };
    void loadFilters();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      await loadResidents();
      if (mounted && isLoading) {
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [search, barangayFilter, statusFilter, currentPage, isLoading]);

  useEffect(() => {
    void loadKpiCounts();
  }, []);

  if (viewingResident) {
    return (
      <ResidentProfileView
        resident={viewingResident}
        onBack={() => setViewingResident(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={3} />
        <ToolbarSkeleton />
        <TableSkeleton cols={7} rows={10} />
      </div>
    );
  }

  const STATUS_TABS = [
    { id: "all", label: "All Residents", count: totalResidentsCount },
    { id: "ACTIVE", label: "Active", count: activeCount },
    { id: "DEACTIVATED", label: "Deactivated", count: deactivatedCount },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Resident Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              View and manage all registered resident accounts across Candelaria.
            </p>
          </div>
        </div>

        <Button
          onClick={exportCSV}
          variant="outline"
          className="h-10 px-4 rounded-xl border border-border/80 bg-card hover:bg-muted font-semibold text-xs shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-primary" /> Export CSV
        </Button>
      </div>

      {/* ── Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: "Total Residents",
            value: totalResidentsCount,
            icon: Users,
            bg: "bg-primary/10 text-primary border-primary/20",
            subtitle: "Registered municipal users",
          },
          {
            label: "Active Accounts",
            value: activeCount,
            icon: UserCheck,
            bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            subtitle: "Verified & active",
          },
          {
            label: "Deactivated / Inactive",
            value: deactivatedCount,
            icon: UserX,
            bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            subtitle: "Suspended or deactivated",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider truncate">
                  {kpi.label}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                    kpi.bg
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
                {kpi.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {kpi.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Resident Directory Table ── */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
        {/* ── Integrated Single-Row Toolbar ── */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 bg-card">
          {/* Left: Status Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none shrink-0">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-background text-muted-foreground border border-border/60"
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Barangay Select */}
            <Select
              value={barangayFilter}
              onValueChange={(v) => {
                setBarangayFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[170px] bg-background border-border/80 rounded-xl text-xs font-semibold">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Barangay" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-64">
                <SelectItem value="all">All Barangays</SelectItem>
                {barangayOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {residents.length === 0 ? (
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
                residents.map((r) => {
                  const initials = r.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <TableRow
                      key={r.id}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      {/* Resident Name & Initials */}
                      <TableCell className="pl-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs font-display shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => void openResidentProfile(r.id)}
                              className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors text-left truncate block cursor-pointer"
                            >
                              {r.fullName}
                            </button>
                            <span className="text-[11px] text-muted-foreground md:hidden truncate block mt-0.5">
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
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{r.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Barangay */}
                      <TableCell className="text-xs">
                        <div className="inline-flex items-center gap-1 text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
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
                          className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${
                            residentStatusStyles[r.status] ||
                            residentStatusStyles.Active
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>

                      {/* 3-Dot Action Menu */}
                      <TableCell className="pr-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg opacity-70 group-hover:opacity-100 hover:bg-muted cursor-pointer transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl shadow-lg border border-border/80 w-44 p-1"
                          >
                            <DropdownMenuItem
                              onClick={() => void openResidentProfile(r.id)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" /> View
                              Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void toggleStatus(r)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              {r.status === "Active" ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />{" "}
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                                  Reactivate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs cursor-pointer"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none font-medium"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Delete Resident Confirmation Modal ── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                Delete Resident Account?
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="py-2.5">
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground font-semibold">
                {deleteTarget?.fullName}
              </strong>
              &apos;s account (@{deleteTarget?.username})? All associated records and
              reports will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </div>

          {/* Footer (Delete button only) */}
          <div className="flex items-center justify-end pt-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteResident()}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs"
            >
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResidents;
