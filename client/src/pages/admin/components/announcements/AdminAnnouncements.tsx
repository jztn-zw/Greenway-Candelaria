import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Megaphone,
  RefreshCw,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAnnouncements } from "./hooks/useAnnouncements";
import AnnouncementKPIs from "./AnnouncementKPIs";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementEditor from "./AnnouncementEditor";
import ReadReceiptModal from "./ReadReceiptModal";
import { AnnouncementsPageSkeleton } from "@/components/PageLoadingSkeletons";
import { Announcement, EditorForm, ITEMS_PER_PAGE } from "./types";

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
  const [showArchived, setShowArchived] = useState(false);

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

  const filtered = useMemo(() => {
    return announcements
      .filter((a) => {
        const isArchived = a.status === "Archived";
        if (showArchived !== isArchived) return false;
        const matchesSearch =
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.body.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || a.type === typeFilter;
        const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
        const matchesStatus = statusFilter === "all" || a.status === statusFilter;
        return matchesSearch && matchesType && matchesPriority && matchesStatus;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (sortBy === "newest") return new Date(b.sentDate || b.scheduledDate || 0).getTime() - new Date(a.sentDate || a.scheduledDate || 0).getTime();
        if (sortBy === "oldest") return new Date(a.sentDate || a.scheduledDate || 0).getTime() - new Date(b.sentDate || b.scheduledDate || 0).getTime();
        if (sortBy === "most-read") return (b.readCount ?? 0) - (a.readCount ?? 0);
        return 0;
      });
  }, [announcements, search, typeFilter, priorityFilter, statusFilter, sortBy, showArchived]);

  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const openEditor = (ann?: Announcement) => {
    if (ann) {
      setEditingAnn(ann);
      setEditorForm({
        ...ann,
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
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((a) => a.id)));
  };

  if (isLoading) return <AnnouncementsPageSkeleton />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Announcements</h1>
              <p className="text-sm text-muted-foreground">Create and manage official MENRO notices and advisories for residents.</p>
            </div>
          </div>
          <Button onClick={() => openEditor()} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Create Announcement
          </Button>
        </div>
      </div>

      <AnnouncementKPIs announcements={announcements} />

      {/* ── Toolbar ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9 bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[145px] bg-background text-xs">
                <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Schedule Change">Schedule Change</SelectItem>
                <SelectItem value="Holiday Reminder">Holiday Reminder</SelectItem>
                <SelectItem value="Emergency Advisory">Emergency Advisory</SelectItem>
                <SelectItem value="General Notice">General Notice</SelectItem>
                <SelectItem value="System Maintenance">System Maintenance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px] bg-background text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px] bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px] bg-background text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="most-read">Most Read</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results info ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> announcement{filtered.length !== 1 && "s"}
          {showArchived && <span className="ml-1 text-muted-foreground/70">(Archived)</span>}
        </p>
        <Button
          variant="ghost" size="sm"
          onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
          className="text-xs gap-1.5"
        >
          {showArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          {showArchived ? "Show Active" : "Show Archived"}
        </Button>
      </div>

      {viewMode === "grid" ? (
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
        <div className="bg-card border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(ann.id)}
                      onCheckedChange={() => toggleSelect(ann.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{ann.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ann.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ann.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditor(ann)}>
                          <Edit2 className="mr-2 w-4 h-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleArchive(ann)}>
                          <Archive className="mr-2 w-4 h-4" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

      <ReadReceiptModal
        announcement={readReceiptTarget}
        open={!!readReceiptTarget}
        onOpenChange={() => setReadReceiptTarget(null)}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewAnn} onOpenChange={(open) => !open && setPreviewAnn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-muted-foreground font-normal">Resident Preview</DialogTitle>
          </DialogHeader>
          {previewAnn && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] font-semibold border-0 shadow-sm ${
                    previewAnn.type === "Schedule Change" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    : previewAnn.type === "Holiday Reminder" ? "bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300"
                    : previewAnn.type === "Emergency Advisory" ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                    : previewAnn.type === "General Notice" ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                    : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  }`}>
                    {previewAnn.type}
                  </Badge>
                  {previewAnn.priority !== "Normal" && (
                    <Badge variant="outline" className={`text-[10px] font-semibold border-0 shadow-sm ${
                      previewAnn.priority === "Emergency" ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                    }`}>
                      {previewAnn.priority}
                    </Badge>
                  )}
                  {previewAnn.edited && <span className="text-[9px] text-muted-foreground">· Edited</span>}
                </div>
                <h3 className="font-bold text-foreground">{previewAnn.title}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{previewAnn.body}</p>
                <p className="text-xs text-muted-foreground">{previewAnn.sentDate || "Not sent yet"}</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Recipients:</span> {previewAnn.totalRecipients.toLocaleString()} residents</p>
                <p><span className="font-medium text-foreground">Target:</span> {previewAnn.targetAudience === "All Residents" ? "All Residents" : previewAnn.targetPreset || previewAnn.targetBarangays.join(", ")}</p>
                {previewAnn.scheduledDate && (
                  <p><span className="font-medium text-foreground">Scheduled:</span> {new Date(previewAnn.scheduledDate).toLocaleString()}</p>
                )}
                {previewAnn.expiryDate && (
                  <p><span className="font-medium text-foreground">Expires:</span> {new Date(previewAnn.expiryDate).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Modal */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this announcement now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendConfirm}>
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove(deleteTarget!.id)}
              className="bg-destructive text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAnnouncements;
