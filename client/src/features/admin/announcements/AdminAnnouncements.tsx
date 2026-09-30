import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useState, useEffect } from "react";
import { Search, Plus, LayoutGrid, List, Megaphone, Trash2, Archive, ArrowUpDown, Send, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "@/lib/toast";
import { useAnnouncements } from "./hooks/useAnnouncements";
import AnnouncementKPIs from "./AnnouncementKPIs";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementListView from "./AnnouncementListView";
import AnnouncementEditor from "./AnnouncementEditor";
import ReadReceiptModal from "./ReadReceiptModal";
import ResidentAnnouncementModal, {
  type AnnouncementDetail,
} from "@/features/resident/announcements/ResidentAnnouncementModal";
import PaginationControls from "@/components/common/PaginationControls";
import { AnnouncementsContentSkeleton, AnnouncementsPageSkeleton } from "@/components/PageLoadingSkeletons";
import { Announcement, EditorForm, isAnnouncementExpired } from "./types";

const ITEMS_PER_PAGE_GRID = 6;
const ITEMS_PER_PAGE_TABLE = 10;

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    const normalized = /^\d{4}-\d{2}-\d{2}/.test(dateStr) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr)
      ? `${dateStr.replace(" ", "T")}Z`
      : dateStr;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return dateStr;
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" })}`;
  } catch {
    return dateStr;
  }
};

const DEFAULT_FORM: EditorForm = {
  title: "",
  body: "",
  type: "General Notice",
  status: "Active",
  targetAudience: "All Residents",
  targetBarangays: [],
  targetPreset: null,
  scheduledDate: "",
  expiryDate: "",
  showOnResidentCalendar: false,
  calendarDate: "",
};

const AdminAnnouncements = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const itemsPerPage = viewMode === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    announcements,
    barangayOptions,
    isInitialLoading,
    isResultsLoading,
    pageError,
    retryPage,
    isSaving,
    createNew,
    updateExisting,
    remove,
    permanentlyDelete,
    toggleArchive,
    duplicate,
    sendNow,
    cancelSchedule,
    resendToUnread,
    totalItems,
    totalPages,
    statusCounts,
    metrics,
  } = useAnnouncements({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch,
    status: statusFilter,
    type: typeFilter,
    sort: sortBy,
  });

  // Editor States
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [editorForm, setEditorForm] = useState<EditorForm>(DEFAULT_FORM);

  // Dialog & Action States
  const [previewAnn, setPreviewAnn] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [readReceiptTarget, setReadReceiptTarget] =
    useState<Announcement | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [pendingSend, setPendingSend] = useState<Announcement | null>(null);
  const [resendTarget, setResendTarget] = useState<Announcement | null>(null);

  const STATUS_TABS: { key: string; label: string }[] = [
    { key: "all", label: "All Notices" },
    { key: "Active", label: "Active" },
    { key: "Scheduled", label: "Scheduled" },
    { key: "Draft", label: "Drafts" },
    { key: "Archived", label: "Archived" },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, search, typeFilter, statusFilter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginated = announcements;

  const openEditor = (ann?: Announcement) => {
    if (ann) {
      const needsExpiryUpdateBeforeRestore =
        ann.status === "Archived" && isAnnouncementExpired(ann.expiryDate);
      const editorAnnouncement = needsExpiryUpdateBeforeRestore
        ? { ...ann, status: "Active" as const }
        : ann;

      setEditingAnn(editorAnnouncement);
      setEditorForm({
        ...editorAnnouncement,
        targetBarangays: ann.targetBarangayIds,
        scheduledDate: ann.scheduledDate ?? "",
        expiryDate: ann.expiryDate ?? "",
        showOnResidentCalendar: Boolean(ann.calendarEventId),
        calendarDate: ann.calendarDate?.split("T")[0] ?? "",
      });
    } else {
      setEditingAnn(null);
      setEditorForm(DEFAULT_FORM);
    }
    setEditorOpen(true);
  };

  const handleSave = async (formToSave = editorForm) => {
    if (editingAnn) {
      await updateExisting(editingAnn.id, formToSave);
    } else {
      await createNew(formToSave);
    }
    setEditorOpen(false);
  };

  const initiateSend = (ann: Announcement) => {
    setPendingSend(ann);
    setConfirmSend(true);
  };

  const handleSendConfirm = async () => {
    if (!pendingSend) return;
    setConfirmSend(false);
    await sendNow(pendingSend);
    setPendingSend(null);
  };

  const handleResendConfirm = async () => {
    if (!resendTarget) return;
    await resendToUnread(resendTarget);
    setResendTarget(null);
  };

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  if (isInitialLoading) return <AnnouncementsPageSkeleton viewMode={viewMode} />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            Announcements
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Broadcast official MENRO advisories, schedule changes, and alerts to residents.
          </p>
        </div>
        <Button
          onClick={() => openEditor()}
          className="h-11 px-5 rounded-xl font-semibold text-xs gap-2 shadow-xs cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Announcement</span>
        </Button>
      </div>

      {/* ── KPIs Overview Cards ── */}
      <AnnouncementKPIs metrics={metrics} />

      {/* ── Filter Bar & Actions ── */}
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-xs backdrop-blur-md">
        {/* Tier 1: Search + Quick Status Tabs */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.key] || 0;
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-95 shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25 font-bold"
                      : "bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                  <span
                    className={`inline-flex items-center justify-center rounded-full leading-none font-bold text-[10px] transition-colors ${
                      count > 9 ? "h-5 min-w-5 px-1.5" : "w-5 h-5"
                    } ${
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                    }`}
                  >
                    {count}
                  </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full xl:w-[330px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search announcements by title or content..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-9 h-10 bg-background border-input/80 rounded-xl text-xs shadow-2xs hover:border-primary/50 focus-visible:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Secondary Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs w-auto min-w-[135px] bg-card border-border/80 rounded-xl">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-xl border border-border">
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              <SelectItem value="Schedule Change" className="text-xs">Schedule Change</SelectItem>
              <SelectItem value="Holiday Reminder" className="text-xs">Holiday Reminder</SelectItem>
              <SelectItem value="Community Event" className="text-xs">Community Event</SelectItem>
              <SelectItem value="Emergency Advisory" className="text-xs">Emergency Advisory</SelectItem>
              <SelectItem value="General Notice" className="text-xs">General Notice</SelectItem>
              <SelectItem value="System Maintenance" className="text-xs">System Maintenance</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </Button>
          )}

          {/* Right side: Sort By + View Mode Toggle */}
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border border-border">
                <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
                <SelectItem value="most-read" className="text-xs">Most Read</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/80 gap-0.5 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content View (Grid or Table) ── */}
      {pageError ? (
        <div role="alert" className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Could not load announcements</p>
          <p className="text-xs text-muted-foreground">{pageError}</p>
          <Button variant="outline" onClick={() => void retryPage()} className="rounded-xl">Try again</Button>
        </div>
      ) : isResultsLoading ? (
        <AnnouncementsContentSkeleton viewMode={viewMode} />
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground border border-border flex items-center justify-center mx-auto">
            <Megaphone className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-display text-foreground">
              No announcements found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || typeFilter !== "all"
                ? "Try adjusting your filters or search keywords to find what you're looking for."
                : "Get started by broadcasting your first community announcement to residents."}
            </p>
          </div>
          <Button
            onClick={() => openEditor()}
            className="h-10 px-4 rounded-xl text-xs font-semibold gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              onPreview={setPreviewAnn}
              onEdit={openEditor}
              onDuplicate={duplicate}
              onResend={setResendTarget}
              onSendNow={initiateSend}
              onArchive={toggleArchive}
              onDelete={setDeleteTarget}
              onCancelSchedule={cancelSchedule}
              onReadReceipt={setReadReceiptTarget}
            />
          ))}
        </div>
      ) : (
        <AnnouncementListView
          announcements={paginated}
          onPreview={setPreviewAnn}
          onEdit={openEditor}
          onDuplicate={duplicate}
          onResend={setResendTarget}
          onSendNow={initiateSend}
          onArchive={toggleArchive}
          onDelete={setDeleteTarget}
          onCancelSchedule={cancelSchedule}
          onReadReceipt={setReadReceiptTarget}
        />
      )}

      {/* ── Pagination ── */}
      {!isResultsLoading && !pageError && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={itemsPerPage}
          itemLabel="announcements"
          onPageChange={setCurrentPage}
          variant="floating"
        />
      )}

      {/* ── Create / Edit Form Modal ── */}
      <AnnouncementEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingAnnouncement={editingAnn}
        form={editorForm}
        setForm={setEditorForm}
        onSave={handleSave}
        isSaving={isSaving}
        barangayOptions={barangayOptions}
      />

      {/* ── Read Receipt Breakdown Modal ── */}
      {readReceiptTarget && (
        <ReadReceiptModal
          announcement={readReceiptTarget}
          open={!!readReceiptTarget}
          onOpenChange={() => setReadReceiptTarget(null)}
        />
      )}

      {/* ── Resident Preview Dialog ── */}
      {previewAnn && (
        <ResidentAnnouncementModal
          open
          onOpenChange={(open) => !open && setPreviewAnn(null)}
          announcementId={previewAnn.id}
          disableReadTracking
          headerTitle="Resident Notice Preview"
          headerDescription="Live resident feed preview"
          showExactTime
          initialAnnouncement={{
            id: previewAnn.id,
            title: previewAnn.title,
            body: previewAnn.body,
            type: previewAnn.type,
            target_all: previewAnn.targetAudience === "All Residents",
            barangays: previewAnn.targetBarangays.map((name) => ({ id: name, name })),
            created_at: previewAnn.createdAt ?? previewAnn.sentAt ?? previewAnn.sentDate,
            sent_at: previewAnn.sentAt ?? previewAnn.sentDate,
            expires_at: previewAnn.expiryDate,
          } satisfies AnnouncementDetail}
          footerDetails={
            <div className="space-y-3">
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground shrink-0">Target Audience:</span>
                  <span className="text-foreground/80 font-medium truncate text-right" title={previewAnn.targetAudience === "All Residents" ? "All Residents" : previewAnn.targetBarangays.join(", ")}>
                    {previewAnn.targetAudience === "All Residents"
                      ? "All Residents"
                      : previewAnn.targetBarangays.length <= 2
                        ? previewAnn.targetBarangays.join(", ")
                        : `${previewAnn.targetBarangays.slice(0, 2).join(", ")} +${previewAnn.targetBarangays.length - 2}`}
                  </span>
                </div>
                {previewAnn.expiryDate && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <span className="font-semibold text-foreground">Auto-Expiry:</span>
                    <span className="text-foreground/80 font-medium text-right">{formatDateTime(previewAnn.expiryDate)}</span>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* ── Confirm Send Now Modal ── */}
      <ConfirmationDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Confirm Immediate Broadcast"
        icon={<Send />}
        description={<>Are you sure you want to broadcast <strong className="font-semibold text-foreground">&ldquo;{pendingSend?.title}&rdquo;</strong> to all targeted residents immediately? A real-time notification will be sent.</>}
        confirmLabel="Confirm & Send Now"
        onConfirm={handleSendConfirm}
        closeOnConfirm
      />

      {/* ── Archive Confirmation Modal ── */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={deleteTarget?.status === "Archived" ? "Delete Permanently?" : "Archive Announcement?"}
        icon={deleteTarget?.status === "Archived" ? <Trash2 /> : <Archive />}
        variant={deleteTarget?.status === "Archived" ? "destructive" : "default"}
        description={<>{deleteTarget?.status === "Archived" ? "Permanently delete" : "Archive"} <strong className="font-semibold text-foreground">&ldquo;{deleteTarget?.title}&rdquo;</strong>? {deleteTarget?.status === "Archived" ? "This cannot be undone. The announcement and its linked notifications will be removed now." : "It will be hidden from resident feeds and notifications. You can restore it from Archive within 30 days."}</>}
        confirmLabel={deleteTarget?.status === "Archived" ? "Delete Permanently" : "Archive Notice"}
        closeOnConfirm
        onConfirm={async () => {
          const ok = deleteTarget!.status === "Archived"
            ? await permanentlyDelete(deleteTarget!.id)
            : await remove(deleteTarget!.id);
          if (ok) setDeleteTarget(null);
        }}
      />

      {/* ── Resend Confirmation Modal ── */}
      <ConfirmationDialog
        open={!!resendTarget}
        onOpenChange={() => setResendTarget(null)}
        title="Resend Announcement?"
        icon={<RotateCcw />}
        description={<>This will re-issue a real-time notification for <strong className="font-semibold text-foreground">&ldquo;{resendTarget?.title}&rdquo;</strong> only to residents who have not yet read or opened this notice.</>}
        confirmLabel="Confirm & Resend"
        onConfirm={handleResendConfirm}
        closeOnConfirm
      />
    </div>
  );
};

export default AdminAnnouncements;
