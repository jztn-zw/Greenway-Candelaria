import { useState } from "react";
import { Bug, ChevronRight, RotateCcw, Search } from "lucide-react";
import PaginationControls from "@/components/common/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import BugReportModal from "./BugReportModal";
import { BUG_APPS, BUG_STATUSES, formatBugDate, mockBugReports, statusStyles, type BugStatus } from "./mockData";

const PAGE_SIZE = 6;

const AdminBugReports = () => {
  const [reports, setReports] = useState(() => mockBugReports.map((report) => ({ ...report, history: [...report.history] })));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  const countStatus = (status: BugStatus) => reports.filter((report) => report.status === status).length;
  const query = search.trim().toLowerCase();
  const filtered = reports.filter((report) =>
    (statusFilter === "all" || report.status === statusFilter) &&
    (appFilter === "all" || report.app === appFilter) &&
    (!query || [report.id, report.title, report.reporter, report.email, report.category, report.description].some((value) => value.toLowerCase().includes(query)))
  ).sort((a, b) => sort === "newest"
    ? Date.parse(b.submittedAt) - Date.parse(a.submittedAt)
    : Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = reports.find((report) => report.id === selectedId);
  const hasFilters = Boolean(query || statusFilter !== "all" || appFilter !== "all" || sort !== "newest");
  const resetFilters = () => { setSearch(""); setStatusFilter("all"); setAppFilter("all"); setSort("newest"); setPage(1); };
  const openReport = (id: string) => { setSelectedId(id); setSavedMessage(""); };
  const saveReport = (status: BugStatus, response: string) => {
    setReports((previous) => previous.map((report) => report.id === selectedId ? {
      ...report, status, response,
      history: status === report.status ? report.history : [...report.history, { status, at: new Date().toISOString(), by: "MENRO Admin" }],
    } : report));
    setSavedMessage(`${selectedId} saved. Demo changes will reset when you leave this page.`);
    setSelectedId(null);
  };

  const metrics = [
    { label: "Total reports", value: reports.length, caption: "Across all applications", style: "bg-muted/70 text-muted-foreground border-border/80" },
    { label: "New reports", value: countStatus("New"), caption: "Awaiting initial review", style: statusStyles.New },
    { label: "Under review", value: countStatus("Under review"), caption: "Being investigated", style: statusStyles["Under review"] },
    { label: "Resolved", value: countStatus("Resolved"), caption: "Reports marked resolved", style: statusStyles.Resolved },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">Bug Reports</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Review technical issues reported by residents and collectors across GreenWay.</p>
        </div>
        <Badge variant="outline" className="self-start sm:self-center rounded-lg bg-primary/5 border-primary/20 text-primary gap-1.5 px-2.5 py-1"><Bug className="h-3.5 w-3.5" />Demo data</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        {metrics.map((metric, index) => <div key={metric.label} className={cn("p-4 sm:p-5 space-y-2.5 transition-colors hover:bg-muted/15", index % 2 === 0 && "border-r border-border/70", index < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0", index < 2 && "border-b lg:border-b-0 border-border/70")}>
          <span className={cn("inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", metric.style)}>{metric.label}</span>
          <p className="text-2xl sm:text-3xl font-bold font-display tracking-tight tabular-nums">{metric.value}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{metric.caption}</p>
        </div>)}
      </div>

      <section aria-label="Bug report filters" className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="flex overflow-x-auto gap-1 px-3 pt-3 border-b border-border/70" role="group" aria-label="Filter by status">
          {["all", ...BUG_STATUSES].map((status) => <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => { setStatusFilter(status); setPage(1); }} className={cn("shrink-0 flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", statusFilter === status ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted")}>
            {status === "all" ? "All reports" : status}{statusFilter === status && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">{status === "all" ? reports.length : countStatus(status as BugStatus)}</span>}
          </button>)}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input aria-label="Search bug reports" placeholder="Search title, reference, or reporter…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9 rounded-xl bg-background" /></div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <Select value={appFilter} onValueChange={(value) => { setAppFilter(value); setPage(1); }}><SelectTrigger aria-label="Filter by application" className="w-full sm:w-40 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All applications</SelectItem>{BUG_APPS.map((app) => <SelectItem key={app} value={app}>{app}</SelectItem>)}</SelectContent></Select>
            <Select value={sort} onValueChange={(value) => { setSort(value); setPage(1); }}><SelectTrigger aria-label="Sort reports" className="flex-1 sm:flex-none sm:w-36 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem></SelectContent></Select>
            {hasFilters && <Button variant="outline" className="rounded-xl gap-1.5" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>}
          </div>
        </div>
      </section>

      <div role="status" aria-live="polite" className={cn("text-xs", savedMessage ? "rounded-xl border border-primary/20 bg-primary/5 p-3 text-primary" : "sr-only")}>{savedMessage}</div>

      <section aria-label="Bug reports list" className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-border/70"><h2 className="text-sm font-bold">Reported issues</h2><span className="text-xs text-muted-foreground tabular-nums">{filtered.length} {filtered.length === 1 ? "report" : "reports"}</span></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/30 border-border/80">{["Issue", "Reporter", "Application", "Date filed", "Status", ""].map((label, index) => <TableHead key={index} className="text-xs font-semibold py-3.5 whitespace-nowrap">{label || <span className="sr-only">View report</span>}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {visible.map((report) => <TableRow key={report.id} className="border-border/60 hover:bg-muted/30 cursor-pointer" onClick={() => openReport(report.id)}>
                <TableCell className="py-4 min-w-64"><button type="button" onClick={(event) => { event.stopPropagation(); openReport(report.id); }} className="text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block text-[10px] font-mono text-muted-foreground mb-1">{report.id}</span><span className="block text-xs font-semibold text-foreground hover:text-primary">{report.title}</span></button><span className="block text-[11px] text-muted-foreground mt-1">{report.category}</span></TableCell>
                <TableCell className="whitespace-nowrap"><p className="text-xs font-medium">{report.reporter}</p><p className="text-[11px] text-muted-foreground mt-1">{report.role}</p></TableCell>
                <TableCell className="whitespace-nowrap"><Badge variant="outline" className="font-medium text-[10px] rounded-md bg-muted/30 border-border/70">{report.app}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{formatBugDate(report.submittedAt)}</TableCell>
                <TableCell><Badge variant="outline" className={cn("text-[10px] whitespace-nowrap rounded-md", statusStyles[report.status])}>{report.status}</Badge></TableCell>
                <TableCell className="pr-4 text-right"><Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" aria-label={`View ${report.id}`} onClick={(event) => { event.stopPropagation(); openReport(report.id); }}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
              </TableRow>)}
              {!visible.length && <TableRow><TableCell colSpan={6} className="py-14 text-center"><div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3"><Bug className="h-6 w-6" /></div><p className="text-sm font-bold">No bug reports found</p><p className="text-xs text-muted-foreground mt-1 mb-4">Try a different search or clear your filters.</p><Button variant="outline" size="sm" className="rounded-xl" onClick={resetFilters}>Clear filters</Button></TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} itemLabel="reports" onPageChange={setPage} />
      </section>
      <p className="text-[11px] text-muted-foreground">Showing sample reports. Status and response changes reset when you leave this page.</p>
      {selected && <BugReportModal key={selected.id} report={selected} onClose={() => setSelectedId(null)} onSave={saveReport} />}
    </div>
  );
};

export default AdminBugReports;
