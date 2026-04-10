import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, RefreshCw, Save, Undo2, Clock } from "lucide-react";
import { useLandingPageStore } from "./useLandingPageStore";
import SectionListPanel from "./SectionListPanel";
import SectionEditorPanel from "./SectionEditorPanel";
import { toast } from "sonner";
import { LandingManagerSkeleton, PageHeaderSkeleton } from "@/components/PageLoadingSkeletons";
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

const parseServerTimestamp = (value: string | null) => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    const parsedUtc = new Date(value.replace(" ", "T") + "Z");
    return Number.isNaN(parsedUtc.getTime()) ? null : parsedUtc;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTimestamp = (value: string | null) => {
  const parsed = parseServerTimestamp(value);
  if (!parsed) return "Never";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeTimestamp = (value: string | null, now: number) => {
  const parsed = parseServerTimestamp(value);
  if (!parsed) {
    return "Unknown";
  }

  const target = parsed.getTime();

  const diffMs = Math.max(now - target, 0);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes === 1) return "1 minute ago";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatTimestamp(value);
};

const LandingPageManager = () => {
  const store = useLandingPageStore();
  const {
    state,
    isLoading,
    isReloading,
    isSaving,
    activeSectionAction,
    dirtySections,
    load,
    toggleSection,
    saveSection,
    discardChanges,
    updateContent,
    setContent,
    addLog,
  } = store;
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!selectedSection && state.sections.length > 0) {
      setSelectedSection(state.sections[0].id);
    }
  }, [selectedSection, state.sections]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const selectedMeta = useMemo(() => {
    if (!selectedSection || !(selectedSection in state.sectionMeta)) return null;
    return state.sectionMeta[selectedSection as keyof typeof state.sectionMeta];
  }, [selectedSection, state.sectionMeta]);

  const selectedSectionHasChanges = selectedSection
    ? dirtySections.includes(selectedSection as typeof dirtySections[number])
    : false;
  const managerStatus = state.isDirty ? "draft" : "published";
  const publishedAt = state.lastSaved;

  const clearPendingNavigation = () => {
    setPendingSection(null);
    setPendingPath(null);
    setShowUnsavedDialog(false);
  };

  const handleStayOnCurrentPage = () => {
    clearPendingNavigation();
  };

  const continuePendingAction = () => {
    if (pendingSection) {
      setSelectedSection(pendingSection);
      clearPendingNavigation();
      return;
    }

    if (pendingPath) {
      navigate(pendingPath);
      return;
    }

    clearPendingNavigation();
  };

  const handleSectionSelect = (nextSectionId: string) => {
    if (nextSectionId === selectedSection) return;

    if (selectedSectionHasChanges) {
      setPendingSection(nextSectionId);
      setShowUnsavedDialog(true);
      return;
    }

    setSelectedSection(nextSectionId);
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!state.isDirty) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");

      if (!link) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const nextUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) return;

      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

      if (nextPath === currentPath) return;

      event.preventDefault();
      setPendingSection(null);
      setPendingPath(nextPath);
      setShowUnsavedDialog(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [state.isDirty]);

  const handleDiscardAndContinue = () => {
    discardChanges();
    continuePendingAction();
  };

  const handleReload = async () => {
    await load(true);
    toast.success("Landing content reloaded from server");
  };

  const handleSaveSection = async () => {
    if (!selectedSection) return;

    try {
      await saveSection(selectedSection as typeof dirtySections[number]);
      addLog(selectedSection, "save", `Saved ${selectedSection} section changes`);
      toast.success("Section saved successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save this section");
    }
  };

  const handleToggleSection = async (id: string) => {
    try {
      await toggleSection(id as typeof dirtySections[number]);
      const currentSection = state.sections.find((section) => section.id === id);
      const nextVisibilityLabel = currentSection?.visible ? "hidden" : "visible";
      addLog(id, "visibility", `Marked ${id} section as ${nextVisibilityLabel}`);
      toast.success(`Section is now ${nextVisibilityLabel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update section visibility");
    }
  };

  const handleDiscard = () => {
    discardChanges(selectedSection as typeof dirtySections[number] | null);
    toast.info(selectedSection ? `Reverted unsaved changes in ${selectedSection}` : "Changes discarded");
    setShowDiscardDialog(false);
  };

  const handlePreview = () => {
    window.open("/", "_blank");
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <LandingManagerSkeleton />
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
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Landing Page Manager</h1>
              <p className="text-sm text-muted-foreground">
                Edit the public GreenWay landing page content, toggle sections, and preview changes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={managerStatus === "published" ? "default" : "secondary"}
              className={managerStatus === "published" ? "bg-primary/10 text-primary border-primary/20" : ""}
            >
              {managerStatus === "published" ? "Published" : "Draft"}
            </Badge>
            {state.isDirty && (
              <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 animate-pulse" />
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap p-3 bg-card border rounded-xl">
        <Button variant="outline" size="sm" onClick={handlePreview} className="gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" /> Preview Landing Page
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="outline" size="sm" onClick={handleReload} className="gap-1.5" disabled={isReloading || isSaving}>
          <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? "animate-spin" : ""}`} /> Reload from Server
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {publishedAt ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Published: {formatRelativeTimestamp(publishedAt, now)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last synced: {formatRelativeTimestamp(state.lastSyncedAt, now)}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Visibility changes are saved immediately. Content edits stay local until you click <span className="font-medium text-foreground">Save Section</span>.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6">
        <SectionListPanel
          sections={state.sections}
          selectedSection={selectedSection}
          onSelect={handleSectionSelect}
          onToggle={handleToggleSection}
        />

        <div className="min-w-0">
          <SectionEditorPanel
            selectedSection={selectedSection}
            content={state.content}
            sections={state.sections}
            sectionMeta={state.sectionMeta}
            activeSectionAction={activeSectionAction}
            onUpdateContent={updateContent}
            onSetContent={setContent}
            onAddLog={addLog}
          />
        </div>
      </div>

      {selectedSection && (
        <div className="sticky bottom-0 z-10 bg-card border rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg">
          <div className="text-xs text-muted-foreground">
            {selectedSectionHasChanges
              ? `You have unsaved content changes in ${selectedSection}.`
              : selectedMeta?.updatedAt
                ? `Updated ${formatRelativeTimestamp(selectedMeta.updatedAt, now)}${selectedMeta.updatedByName ? ` by ${selectedMeta.updatedByName}` : ""}.`
                : "This section has not been edited yet."}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (selectedSectionHasChanges ? setShowDiscardDialog(true) : null)}
              disabled={!selectedSectionHasChanges || isSaving}
              className="gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" /> Discard Section Changes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSection}
              disabled={!selectedSectionHasChanges || isSaving}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Section
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Section Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the selected section to the last saved version from the backend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={(open) => (!open ? handleStayOnCurrentPage() : setShowUnsavedDialog(true))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the Landing Page Manager. If you leave now, your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={handleStayOnCurrentPage}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardAndContinue}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LandingPageManager;

