import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormDialogHeader } from "@/components/FormDialog";
import { formDialogStyles } from "@/components/formDialogStyles";
import { cn } from "@/lib/utils";
import "@/components/communityContent.css";

/** Popup edits stay local until Apply; opening starts from the current filters. */
export function AdminFilterDialog<T extends object>({ title, values, onApply, resetValues, activeCount = 0, children, className = "admin-toolbar-mobile-only" }: {
  title: string;
  values: T;
  onApply: (values: T) => void;
  resetValues?: NoInfer<T>;
  activeCount?: number;
  children: (draft: T, setDraft: Dispatch<SetStateAction<T>>) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraft(values);
    setOpen(nextOpen);
  };
  return (
    <div className={cn("shrink-0", className)}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant={activeCount > 0 ? "primary-outline" : "outline"} className="admin-toolbar-filter-button h-10 gap-1.5 rounded-xl px-3 text-xs" aria-label={`Open ${title.toLowerCase()}`}>
            <SlidersHorizontal className="size-3.5" />
            Filters
            {activeCount > 0 && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-ui-caption tabular-nums">{activeCount}</span>}
          </Button>
        </DialogTrigger>
        <DialogContent className={cn(formDialogStyles.content, "admin-filter-dialog")}>
          <FormDialogHeader
            title={title}
            icon={<SlidersHorizontal />}
            description="Refine the displayed records."
            closeLabel="Close filters"
            onClose={() => setOpen(false)}
          />
          <div className={cn(formDialogStyles.body, "admin-filter-fields")}>
            {children(draft, setDraft)}
          </div>
          <div className={cn(formDialogStyles.footer, "flex-nowrap gap-2")}>
            {resetValues && (
              <Button type="button" variant="outline" size="sm" className="h-11 shrink-0 gap-1.5 rounded-xl px-3 text-xs" onClick={() => setDraft(resetValues)} aria-label="Reset filters">
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
            <Button type="button" className="h-11 min-w-0 flex-1 whitespace-normal rounded-xl px-3 text-xs" onClick={() => { onApply(draft); setOpen(false); }}>Apply Filters</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminFilterField({ label, children }: { label: string; children: ReactNode }) {
  return <fieldset className="min-w-0 space-y-1.5"><legend className="mb-1.5 text-ui-caption font-semibold uppercase tracking-wider text-muted-foreground">{label}</legend>{children}</fieldset>;
}

export function AdminToolbarFilterSkeleton({ className = "admin-toolbar-mobile-only" }: { className?: string }) {
  return <div aria-hidden="true" className={cn("pointer-events-none shrink-0", className)}><Skeleton className="admin-toolbar-filter-button flex h-10 items-center gap-1.5 rounded-xl border border-border/80 px-3 text-xs font-semibold"><span className="size-3.5" /><span className="invisible">Filters</span></Skeleton></div>;
}
