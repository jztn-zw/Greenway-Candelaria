import { SearchInput } from "@/components/common/SearchInput";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { useState, useEffect } from "react";
import { Plus, LayoutGrid, List, Megaphone, Trash2, Archive, ArrowUpDown, Send, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    hasLoadedPage,
    isRefreshing,
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
    totalPages,
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

  const STATUS_TABS: FilterPillItem<string>[] = [
    { id: "all", label: "All Notices" },
    { id: "Active", label: "Active" },
    { id: "Scheduled", label: "Scheduled" },
    { id: "Draft", label: "Drafts" },
    { id: "Archived", label: "Archived" },
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
    const ok = await sendNow(pendingSend);
    if (!ok) return false;
    setConfirmSend(false);
    setPendingSend(null);
  };

  const handleResendConfirm = async () => {
    if (!resendTarget) return;
    const ok = await resendToUnread(resendTarget);
    if (!ok) return false;
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
  if (pageError && !hasLoadedPage && !editorOpen) return <PageErrorState kind="unavailable" description="We couldn't load announcements. Please try again." onRetry={() => void retryPage()} retrying={isRefreshing} homeHref="/admin" />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
            Announcements
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Broadcast official MENRO advisories, schedule changes, and alerts to residents.
          </p>
        </div>
        <Button
          onClick={() => openEditor()}
          className="h-11 px-5 rounded-xl font-semibold text-xs gap-2 shadow-xs cursor-pointer shrink-0"
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
          <FilterPillTabs
            items={STATUS_TABS}
            activeId={statusFilter}
            onChange={(status) => {
              setStatusFilter(status);
              setCurrentPage(1);
            }}
            ariaLabel="Announcement status filters"
          />

          {/* Search Input */}
          <SearchInput
            placeholder="Search announcements by title or content..."
            value={search}
            onChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            containerClassName="w-full xl:w-[330px] shrink-0"
          />
        </div>

        {/* Tier 2: Secondary Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="mr-1 inline-flex items-center gap-1.5 text-ui-caption font-semibold uppercase tracking-wider text-muted-foreground">
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
              className="h-9 px-2.5 text-xs rounded-xl gap-1.5 cursor-pointer transition-colors"
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
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "gw-action-ghost "
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "gw-action-ghost "
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
      {pageError && <DataRefreshNotice message="Couldn't update announcements. Showing the previous results, which may be outdated or differ from your filters." onRetry={() => void retryPage()} retrying={isRefreshing} />}
      {isResultsLoading ? (
        <AnnouncementsContentSkeleton viewMode={viewMode} />
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground border border-border flex items-center justify-center mx-auto">
            <Megaphone className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="gw-heading text-base text-foreground">
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
            className="h-10 px-4 rounded-xl text-xs font-semibold gap-2 shadow-xs cursor-pointer "
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
        pendingLabel="Sending announcement…"
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
        pendingLabel={deleteTarget?.status === "Archived" ? "Deleting announcement…" : "Archiving announcement…"}
        closeOnConfirm
        onConfirm={async () => {
          const ok = deleteTarget!.status === "Archived"
            ? await permanentlyDelete(deleteTarget!.id)
            : await remove(deleteTarget!.id);
          if (ok) setDeleteTarget(null);
          return ok;
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
        pendingLabel="Resending announcement…"
        onConfirm={handleResendConfirm}
        closeOnConfirm
      />
    </div>
  );
};

export default AdminAnnouncements;
