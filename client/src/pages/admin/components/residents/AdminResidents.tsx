import { useState, useEffect, useRef } from "react";
import {
  Search, Download, Eye, Trash2, UserX, UserCheck, ChevronLeft, ChevronRight,
  Filter, Users, UserPlus, UserMinus, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Resident, ResidentReport } from "./mockData";
import ResidentProfileView from "./ResidentProfile";
import {
  PageHeaderSkeleton, KPIRowSkeleton, ToolbarSkeleton, TableSkeleton,
} from "@/components/PageLoadingSkeletons";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import {
  deleteResident as deleteResidentAccount,
  fetchResidentById,
  fetchResidentReports,
  fetchResidents,
  updateResidentStatus,
  type ResidentAccountStatus,
  type ResidentDetailsRow,
  type ResidentListRow,
  type ResidentReportRow,
} from "@/services/residentManagerService";

const ITEMS_PER_PAGE = 12;

const formatDate = (value?: string | null): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toTitle = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const mapStatus = (status: ResidentAccountStatus): Resident["status"] =>
  status === "ACTIVE" ? "Active" : "Deactivated";

const mapResidentRow = (row: ResidentListRow): Resident => ({
  id: row.id,
  fullName: row.full_name,
  username: row.username,
  email: row.email,
  phone: row.phone || "N/A",
  barangay: row.barangay_name || "Unassigned",
  dateRegistered: formatDate(row.created_at),
  lastLogin: formatDate(row.last_login_at),
  status: mapStatus(row.status),
  twoFactorEnabled: false,
  reports: [],
});

const mapReportStatus = (status: string): ResidentReport["status"] => {
  const key = String(status || "").toUpperCase();
  if (key === "RESOLVED") return "Resolved";
  if (key === "UNDER_REVIEW" || key === "DISPATCHED") return "Under Review";
  return "Pending";
};

const mapReportRow = (row: ResidentReportRow): ResidentReport => ({
  referenceNumber: row.reference_number,
  violationType: toTitle(row.violation_type),
  dateSubmitted: formatDate(row.created_at),
  status: mapReportStatus(row.status),
});

const mapDetails = (details: ResidentDetailsRow, reports: ResidentReportRow[]): Resident => ({
  id: details.id,
  fullName: details.full_name,
  username: details.username,
  email: details.email,
  phone: details.phone || "N/A",
  barangay: details.barangay_name || "Unassigned",
  dateRegistered: formatDate(details.created_at),
  lastLogin: formatDate(details.last_login_at),
  status: mapStatus(details.status),
  twoFactorEnabled: Boolean(details.two_factor),
  reports: reports.map(mapReportRow),
});

const AdminResidents = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResidentsCount, setTotalResidentsCount] = useState(0);
  const [filteredResidentsCount, setFilteredResidentsCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [deactivatedCount, setDeactivatedCount] = useState(0);
  const [barangayOptions, setBarangayOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);
  const requestSeq = useRef(0);

  const paginated = residents;
  const filtered = { length: filteredResidentsCount };

  const loadResidents = async () => {
    const seq = ++requestSeq.current;
    const normalizedSearch = search.trim();

    try {
      const result = await fetchResidents({
        search: normalizedSearch || undefined,
        barangay_id: barangayFilter === "all" ? undefined : barangayFilter,
        status: statusFilter === "all" ? undefined : (statusFilter as ResidentAccountStatus),
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      if (seq !== requestSeq.current) return;

      setResidents((result.data || []).map(mapResidentRow));
      setTotalPages(Math.max(1, Number(result.pagination?.total_pages || 1)));
      setFilteredResidentsCount(Number(result.pagination?.total || 0));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      toast.error(err instanceof Error ? err.message : "Failed to load residents.");
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
      if (paginated.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await loadResidents();
      }
      await loadKpiCounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete resident.");
    }
  };

  const openResidentProfile = async (residentId: string) => {
    try {
      const [residentDetails, residentReports] = await Promise.all([
        fetchResidentById(residentId),
        fetchResidentReports(residentId),
      ]);
      setViewingResident(mapDetails(residentDetails, residentReports));
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
        status: statusFilter === "all" ? undefined : (statusFilter as ResidentAccountStatus),
        page: 1,
        limit: 10000,
      });
      const exportRows = (result.data || []).map(mapResidentRow);

    const headers = ["Full Name", "Username", "Email", "Barangay", "Date Registered", "Last Login", "Status"];
      const rows = exportRows.map(r => [r.fullName, r.username, r.email, r.barangay, r.dateRegistered, r.lastLogin, r.status]);
      const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "residents.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV.");
    }
  };

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
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
    return <ResidentProfileView resident={viewingResident} onBack={() => setViewingResident(null)} />;
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

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Resident Manager</h1>
              <p className="text-sm text-muted-foreground">View and manage all registered resident accounts.</p>
            </div>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Residents", value: totalResidentsCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active", value: activeCount, icon: UserPlus, color: "text-[hsl(var(--leaf))]", bg: "bg-[hsl(var(--leaf))]/10" },
          { label: "Deactivated", value: deactivatedCount, icon: UserMinus, color: "text-destructive", bg: "bg-destructive/10" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, or email..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); }}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={barangayFilter} onValueChange={v => { setBarangayFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[170px] bg-background text-xs">
                <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Barangay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Barangays</SelectItem>
                {barangayOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px] bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Barangay</TableHead>
                <TableHead className="hidden lg:table-cell">Registered</TableHead>
                <TableHead className="hidden xl:table-cell">Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No residents found.</TableCell></TableRow>
              ) : paginated.map(r => (
                <TableRow key={r.id} className="group">
                  <TableCell>
                    <button onClick={() => void openResidentProfile(r.id)} className="font-medium text-foreground hover:text-primary transition-colors text-left">
                      {r.fullName}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">@{r.username}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{r.email}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{r.barangay}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{r.dateRegistered}</TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">{r.lastLogin}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "Active"
                      ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void openResidentProfile(r.id)}>
                          <Eye className="w-3.5 h-3.5 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void toggleStatus(r)}>
                          {r.status === "Active"
                            ? <><UserX className="w-3.5 h-3.5 mr-2" /> Deactivate</>
                            : <><UserCheck className="w-3.5 h-3.5 mr-2" /> Reactivate</>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="hidden text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredResidentsCount)} of {filteredResidentsCount}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)
              ).map(p => (
                <Button key={p} variant={p === currentPage ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(p)}>
                  {p}
                </Button>
              ))}
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resident Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.fullName}</strong>'s account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteResident()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminResidents;
