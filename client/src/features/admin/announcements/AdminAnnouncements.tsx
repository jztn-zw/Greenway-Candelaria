import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Megaphone,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Send,
  Clock,
  Pin,
  X,
  SlidersHorizontal,
  RotateCcw,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAnnouncements } from "./hooks/useAnnouncements";
import AnnouncementKPIs from "./AnnouncementKPIs";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementListView from "./AnnouncementListView";
import AnnouncementEditor from "./AnnouncementEditor";
import ReadReceiptModal from "./ReadReceiptModal";
import { AnnouncementsPageSkeleton } from "@/components/PageLoadingSkeletons";
import { Announcement, EditorForm, announcementTypeStyles, announcementPriorityStyles } from "./types";

const ITEMS_PER_PAGE_GRID = 6;
const ITEMS_PER_PAGE_TABLE = 10;

const DEFAULT_FORM: EditorForm = {
  title: "",
  body: "",
  type: "General Notice",
  priority: "Normal",
  status: "Draft",
  targetAudience: "All Residents",
  targetBarangays: [],
  targetPreset: null,
  featured: false,
  scheduledDate: "",
  expiryDate: "",
};

const AdminAnnouncements = () => {
  const {
    announcements,
    barangayOptions,
    isLoading,
    isSaving,
    loadAnnouncements,
    createNew,
    updateExisting,
    remove,
    toggleArchive,
    duplicate,
    sendNow,
    cancelSchedule,
    togglePin,
    bulkArchive,
  } = useAnnouncements();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: announcements.filter((a) => a.status !== "Archived").length,
      Active: 0,
      Scheduled: 0,
      Draft: 0,
      Archived: 0,
    };
    announcements.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++;
      }
    });
    return counts;
  }, [announcements]);

  const STATUS_TABS: { key: string; label: string }[] = [
    { key: "all", label: "All Notices" },
    { key: "Active", label: "Active" },
    { key: "Scheduled", label: "Scheduled" },
    { key: "Draft", label: "Drafts" },
    { key: "Archived", label: "Archived" },
  ];

  const filtered = useMemo(() => {
    return announcements
      .filter((a) => {
        const matchesSearch =
          search === "" ||
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.body.toLowerCase().includes(search.toLowerCase());

        const matchesType = typeFilter === "all" || a.type === typeFilter;
        const matchesPriority =
          priorityFilter === "all" || a.priority === priorityFilter;

        const matchesStatus =
          statusFilter === "all"
            ? a.status !== "Archived"
            : a.status === statusFilter;

        return matchesSearch && matchesType && matchesPriority && matchesStatus;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (sortBy === "newest") {
          return (
            new Date(b.sentDate || b.scheduledDate || 0).getTime() -
            new Date(a.sentDate || a.scheduledDate || 0).getTime()
          );
        }
        if (sortBy === "oldest") {
          return (
            new Date(a.sentDate || a.scheduledDate || 0).getTime() -
            new Date(b.sentDate || b.scheduledDate || 0).getTime()
          );
        }
        if (sortBy === "most-read") {
          return (b.readCount ?? 0) - (a.readCount ?? 0);
        }
        return 0;
      });
  }, [announcements, search, typeFilter, priorityFilter, statusFilter, sortBy]);

  const itemsPerPage =
    viewMode === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, search, typeFilter, priorityFilter, statusFilter]);

  const paginated = useMemo(() => {
    return filtered.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filtered, currentPage, itemsPerPage]);

  const openEditor = (ann?: Announcement) => {
    if (ann) {
      setEditingAnn(ann);
      setEditorForm({
        ...ann,
        targetBarangays: ann.targetBarangayIds,
        scheduledDate: ann.scheduledDate ?? "",
        expiryDate: ann.expiryDate ?? "",
      });
    } else {
      setEditingAnn(null);
      setEditorForm(DEFAULT_FORM);
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const success = editingAnn
      ? await updateExisting(editingAnn.id, editorForm)
      : await createNew(editorForm);
    if (success) setEditorOpen(false);
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
    await updateExisting(resendTarget.id, {
      ...resendTarget,
      status: "Active",
      scheduledDate: resendTarget.scheduledDate ?? "",
      expiryDate: resendTarget.expiryDate ?? "",
    });
    toast.success("Resent to unread residents");
    setResendTarget(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((a) => a.id)));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    await bulkArchive(selectedIds);
    setSelectedIds(new Set());
  };

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPriorityFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  if (isLoading) return <AnnouncementsPageSkeleton />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Announcements
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Broadcast official MENRO advisories, schedule changes, and alerts to residents.
            </p>
          </div>
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
      <AnnouncementKPIs announcements={announcements} />

      {/* ── Standardized 2-Tier Filter Card Container ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        {/* Tier 1: Status Navigation & Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
          {/* Status Pills with Circular Count Badges */}
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
                      : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
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
            {activeFilterCount > 0 && (
              <Badge className="h-4 min-w-4 justify-center rounded-full border-0 bg-primary/15 px-1 text-[9px] text-primary hover:bg-primary/15">
                {activeFilterCount}
              </Badge>
            )}
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
              <SelectItem value="Emergency Advisory" className="text-xs">Emergency Advisory</SelectItem>
              <SelectItem value="General Notice" className="text-xs">General Notice</SelectItem>
              <SelectItem value="System Maintenance" className="text-xs">System Maintenance</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={priorityFilter}
            onValueChange={(v) => {
              setPriorityFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs w-auto min-w-[120px] bg-card border-border/80 rounded-xl">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-xl border border-border">
              <SelectItem value="all" className="text-xs">All Priority</SelectItem>
              <SelectItem value="Normal" className="text-xs">Normal</SelectItem>
              <SelectItem value="Urgent" className="text-xs">Urgent</SelectItem>
              <SelectItem value="Emergency" className="text-xs">Emergency</SelectItem>
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

      {/* ── Bulk Actions Bar (when items selected) ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-1">
          <span className="font-semibold text-primary">{selectedIds.size} selected</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkArchive}
            className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer"
          >
            <Archive className="w-3 h-3" />
            Archive Selected
          </Button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground underline text-[11px] cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Content View (Grid or Table) ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground border border-border flex items-center justify-center mx-auto">
            <Megaphone className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-display text-foreground">
              No announcements found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || typeFilter !== "all" || priorityFilter !== "all"
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
              isSelected={selectedIds.has(ann.id)}
              onSelect={toggleSelect}
              onPreview={setPreviewAnn}
              onEdit={openEditor}
              onDuplicate={duplicate}
              onTogglePin={togglePin}
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
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onPreview={setPreviewAnn}
          onEdit={openEditor}
          onDuplicate={duplicate}
          onTogglePin={togglePin}
          onResend={setResendTarget}
          onSendNow={initiateSend}
          onArchive={toggleArchive}
          onDelete={setDeleteTarget}
          onCancelSchedule={cancelSchedule}
          onReadReceipt={setReadReceiptTarget}
        />
      )}

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
      <Dialog
        open={!!previewAnn}
        onOpenChange={(open) => !open && setPreviewAnn(null)}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-md p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background [&>button:last-child]:hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 pb-3.5 border-b border-border/60 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                  Resident Notice Preview
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Live resident feed preview
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewAnn(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {previewAnn && (
            <div className="p-4 sm:p-5 space-y-4 text-left">
              {/* Notice Card simulating resident feed item */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${announcementTypeStyles[previewAnn.type] || ""}`}
                  >
                    {previewAnn.type}
                  </Badge>
                  {previewAnn.priority !== "Normal" && (
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${announcementPriorityStyles[previewAnn.priority] || ""}`}
                    >
                      {previewAnn.priority}
                    </Badge>
                  )}
                  {previewAnn.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Pin className="w-3 h-3 fill-primary" /> Pinned
                    </span>
                  )}
                </div>

                {/* Title & Body */}
                <h3 className="text-base sm:text-lg font-bold font-display text-foreground leading-snug">
                  {previewAnn.title}
                </h3>
                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                  {previewAnn.body}
                </p>

                {/* Sent / Scheduled Timestamp */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2.5 border-t border-border/60">
                  <Send className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {previewAnn.sentDate
                      ? `Broadcast on ${previewAnn.sentDate}`
                      : previewAnn.scheduledDate
                        ? `Scheduled for ${new Date(previewAnn.scheduledDate).toLocaleString()}`
                        : "Draft Notice (Not Sent)"}
                  </span>
                </div>
              </div>

              {/* Delivery Metadata Strip */}
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Target Audience:</span>
                  <span className="text-foreground/80 font-medium">
                    {previewAnn.targetAudience === "All Residents"
                      ? "All Residents (Municipality-wide)"
                      : previewAnn.targetPreset ||
                        `${previewAnn.targetBarangays.length} Barangays`}
                  </span>
                </div>
                {previewAnn.expiryDate && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="font-semibold text-foreground">Auto-Expiry:</span>
                    <span className="text-foreground/80 font-medium">
                      {new Date(previewAnn.expiryDate).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm Send Now Modal ── */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent className="rounded-2xl border border-border/80 p-6 shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1">
              <Send className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold font-display text-foreground">
              Confirm Immediate Broadcast
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to broadcast &quot;{pendingSend?.title}&quot; to all
              targeted residents immediately? A real-time notification will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-10 px-4 rounded-xl border-border text-xs font-semibold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendConfirm}
              className="h-10 px-5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Confirm & Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation Modal ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl border border-border/80 p-6 shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mb-1">
              <Trash2 className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold font-display text-foreground">
              Delete Announcement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action
              cannot be undone and will remove it from resident feeds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-10 px-4 rounded-xl border-border text-xs font-semibold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const ok = await remove(deleteTarget!.id);
                if (ok) setDeleteTarget(null);
              }}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-xs"
            >
              Delete Notice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Resend Confirmation Modal ── */}
      <AlertDialog
        open={!!resendTarget}
        onOpenChange={() => setResendTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl border border-border/80 p-6 shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1">
              <Send className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold font-display text-foreground">
              Resend to Unread Residents
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will re-issue a notification for &quot;{resendTarget?.title}&quot; only to
              residents who have not yet read or opened this notice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-10 px-4 rounded-xl border-border text-xs font-semibold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResendConfirm}
              className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Confirm & Resend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAnnouncements;
