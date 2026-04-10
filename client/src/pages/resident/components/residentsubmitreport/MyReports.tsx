import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, ChevronRight, Clock, FileText, CheckCircle, AlertCircle,
  ArrowLeft, MapPin, Camera, EyeOff, MessageSquare, RefreshCw, X,
  SortAsc, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubmittedReport, ReportStatus } from "./types";
import { VIOLATION_OPTIONS } from "./types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MyReportsSkeleton } from "@/components/PageLoadingSkeletons";

type FilterTab = "all" | ReportStatus;
type SortOption = "newest" | "oldest" | "status";

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string; order: number }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", order: 0 },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", order: 1 },
  "under-review": { label: "Under Review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", order: 2 },
  dispatched: { label: "Dispatched", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", order: 3 },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", order: 4 },
};

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Pending" },
  { value: "under-review", label: "Under Review" },
  { value: "dispatched", label: "Dispatched" },
  { value: "resolved", label: "Resolved" },
];

const MOCK_REPORTS: SubmittedReport[] = [
  {
    id: "1",
    referenceNumber: "RPT-2026-00142",
    violationType: "illegal-dumping",
    barangay: "Candelaria Proper",
    streetOrLandmark: "Near the public market",
    description: "Large pile of construction debris dumped near the drainage canal.",
    photoCount: 2,
    isAnonymous: false,
    status: "under-review",
    submittedAt: new Date(2026, 2, 28),
    updatedAt: new Date(2026, 2, 29),
    adminResponse: "Our team has been dispatched to inspect the reported area. We will update you within 48 hours.",
    statusHistory: [
      { status: "submitted", timestamp: new Date(2026, 2, 28), label: "Report submitted" },
      { status: "under-review", timestamp: new Date(2026, 2, 29), label: "Under review by MENRO" },
    ],
  },
  {
    id: "2",
    referenceNumber: "RPT-2026-00138",
    violationType: "missed-collection",
    barangay: "Pahinga Norte",
    streetOrLandmark: "",
    description: "Garbage truck did not come on the scheduled day (Monday). Waste has been sitting for 3 days.",
    photoCount: 1,
    isAnonymous: true,
    status: "dispatched",
    submittedAt: new Date(2026, 2, 25),
    updatedAt: new Date(2026, 2, 27),
    statusHistory: [
      { status: "submitted", timestamp: new Date(2026, 2, 25), label: "Report submitted" },
      { status: "under-review", timestamp: new Date(2026, 2, 26), label: "Under review" },
      { status: "dispatched", timestamp: new Date(2026, 2, 27), label: "Collection truck dispatched" },
    ],
  },
  {
    id: "3",
    referenceNumber: "RPT-2026-00120",
    violationType: "overflowing-bin",
    barangay: "Malabanban Norte",
    streetOrLandmark: "Corner of Rizal St.",
    description: "Community bin has been overflowing for 3 days. Causing foul odor in the area.",
    photoCount: 3,
    isAnonymous: false,
    status: "resolved",
    submittedAt: new Date(2026, 2, 20),
    updatedAt: new Date(2026, 2, 23),
    adminResponse: "The overflowing bin has been emptied and the area has been cleaned. A second bin will be installed next week to prevent recurrence.",
    statusHistory: [
      { status: "submitted", timestamp: new Date(2026, 2, 20), label: "Report submitted" },
      { status: "under-review", timestamp: new Date(2026, 2, 20), label: "Under review" },
      { status: "dispatched", timestamp: new Date(2026, 2, 21), label: "Cleanup crew dispatched" },
      { status: "resolved", timestamp: new Date(2026, 2, 23), label: "Issue resolved" },
    ],
  },
  {
    id: "4",
    referenceNumber: "RPT-2026-00155",
    violationType: "open-burning",
    barangay: "San Andres",
    streetOrLandmark: "Behind the barangay hall",
    description: "Resident burning plastic waste in their backyard.",
    photoCount: 2,
    isAnonymous: false,
    status: "submitted",
    submittedAt: new Date(2026, 3, 1),
    updatedAt: new Date(2026, 3, 1),
    statusHistory: [
      { status: "submitted", timestamp: new Date(2026, 3, 1), label: "Report submitted" },
    ],
  },
];

const MyReports = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedReport, setSelectedReport] = useState<SubmittedReport | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let reports = MOCK_REPORTS.filter(
      (r) =>
        r.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.barangay.toLowerCase().includes(search.toLowerCase())
    );

    if (activeTab !== "all") {
      reports = reports.filter((r) => r.status === activeTab);
    }

    // Sort
    reports = [...reports].sort((a, b) => {
      if (sortBy === "newest") return b.submittedAt.getTime() - a.submittedAt.getTime();
      if (sortBy === "oldest") return a.submittedAt.getTime() - b.submittedAt.getTime();
      return STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order;
    });

    return reports;
  }, [search, activeTab, sortBy]);

  const getViolationLabel = (type: string) =>
    VIOLATION_OPTIONS.find((v) => v.value === type)?.label || type;

  const getViolationIcon = (type: string) => {
    const Icon = VIOLATION_OPTIONS.find((v) => v.value === type)?.icon;
    return Icon ? <Icon className="w-5 h-5 text-primary" /> : null;
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: MOCK_REPORTS.length };
    MOCK_REPORTS.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, []);

  // Stats
  const totalReports = MOCK_REPORTS.length;
  const resolvedReports = MOCK_REPORTS.filter(r => r.status === "resolved").length;
  const pendingReports = MOCK_REPORTS.filter(r => r.status !== "resolved").length;

  if (isLoading) {
    return <MyReportsSkeleton />;
  }

  // Detail view
  if (selectedReport) {
    return (
      <ReportDetail
        report={selectedReport}
        onBack={() => setSelectedReport(null)}
        onResubmit={() => {
          navigate("/resident/report");
          toast.info("Form pre-filled with previous report details.");
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">My Reports</h1>
            <p className="text-sm text-muted-foreground">
              View all your previously submitted reports and their current status.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={FileText} label="Total Reports" value={totalReports} color="primary" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolvedReports} color="green" />
        <StatCard icon={AlertCircle} label="Pending" value={pendingReports} color="amber" />
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference number or barangay..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl">
            <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
            )}
          >
            {tab.label}
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center rounded-full",
                activeTab === tab.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tabCounts[tab.value] || 0}
            </Badge>
          </button>
        ))}
      </div>

      {/* Report List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="border border-border">
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No reports found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((report) => {
          const statusConf = STATUS_CONFIG[report.status];
          return (
            <Card
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    {getViolationIcon(report.violationType)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{getViolationLabel(report.violationType)}</span>
                      <Badge variant="secondary" className={cn("text-[10px] font-semibold border-0 rounded-lg", statusConf.className)}>
                        {statusConf.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{report.barangay}{report.streetOrLandmark ? ` · ${report.streetOrLandmark}` : ""}</p>
                    <p className="text-xs text-muted-foreground/80 line-clamp-1">{report.description}</p>

                    {/* Admin response preview */}
                    {report.adminResponse && (
                      <div className="flex items-start gap-1.5 mt-1 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <MessageSquare className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-primary">MENRO Response</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{report.adminResponse}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <span className="text-[11px] font-mono text-primary font-semibold">{report.referenceNumber}</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {report.submittedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {report.isAnonymous && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-lg font-medium">Anonymous</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                </div>

                {/* Status progress */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1">
                    {(["submitted", "under-review", "dispatched", "resolved"] as ReportStatus[]).map((step, i) => {
                      const steps: ReportStatus[] = ["submitted", "under-review", "dispatched", "resolved"];
                      const currentIdx = steps.indexOf(report.status);
                      const active = i <= currentIdx;
                      return (
                        <div key={step} className="flex-1">
                          <div className={cn(
                            "h-1.5 rounded-full transition-all",
                            active ? "bg-primary" : "bg-border"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {["Submitted", "Review", "Dispatched", "Resolved"].map((l) => (
                      <span key={l} className="text-[9px] text-muted-foreground">{l}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg sm:text-xl font-bold font-display text-foreground">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Report Detail component
const ReportDetail = ({
  report,
  onBack,
  onResubmit,
}: {
  report: SubmittedReport;
  onBack: () => void;
  onResubmit: () => void;
}) => {
  const violation = VIOLATION_OPTIONS.find((v) => v.value === report.violationType);
  const statusConf = STATUS_CONFIG[report.status];

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold font-display text-foreground truncate">{report.referenceNumber}</h2>
          <p className="text-xs text-muted-foreground">Report Details</p>
        </div>
        <Badge variant="secondary" className={cn("text-xs font-semibold border-0 rounded-lg", statusConf.className)}>
          {statusConf.label}
        </Badge>
      </div>

      {/* Violation Type */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Violation Type</p>
          {violation && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <violation.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{violation.label}</p>
                <p className="text-xs text-muted-foreground">{violation.description}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location + Details */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Location</p>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{report.barangay}</p>
                {report.streetOrLandmark && <p className="text-xs text-muted-foreground mt-0.5">{report.streetOrLandmark}</p>}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Description</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{report.description}</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              {report.photoCount} photo{report.photoCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {report.submittedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
            {report.isAnonymous && (
              <span className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" />
                Anonymous
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Progress */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-4">Status Progress</p>
          <div className="flex items-center gap-1 mb-3">
            {(["submitted", "under-review", "dispatched", "resolved"] as ReportStatus[]).map((step, i) => {
              const steps: ReportStatus[] = ["submitted", "under-review", "dispatched", "resolved"];
              const currentIdx = steps.indexOf(report.status);
              const active = i <= currentIdx;
              return (
                <div key={step} className="flex-1">
                  <div className={cn("h-2 rounded-full transition-all", active ? "bg-primary" : "bg-border")} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mb-5">
            {["Submitted", "Review", "Dispatched", "Resolved"].map((l) => (
              <span key={l} className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{l}</span>
            ))}
          </div>

          {/* Status History */}
          {report.statusHistory && report.statusHistory.length > 0 && (
            <div className="space-y-0 border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">History</p>
              {report.statusHistory.map((entry, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1.5 ring-2 ring-card",
                      idx === report.statusHistory!.length - 1 ? "bg-primary" : "bg-border"
                    )} />
                    {idx < report.statusHistory!.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-semibold text-foreground">{entry.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at{" "}
                      {entry.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Response */}
      {report.adminResponse && (
        <Card className="border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-primary" />
              <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">MENRO Official Response</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{report.adminResponse}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {report.status === "resolved" && (
          <Button onClick={onResubmit} variant="outline" className="h-12 rounded-xl text-sm font-semibold gap-2 flex-1">
            <RefreshCw className="w-4 h-4" />
            Report Again
          </Button>
        )}
        <Button
          variant="outline"
          className="h-12 rounded-xl text-sm font-semibold gap-2 flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <AlertCircle className="w-4 h-4" />
          Report an Issue
        </Button>
      </div>
    </div>
  );
};

export default MyReports;
