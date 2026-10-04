import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  variant?: "table" | "floating" | "inline";
  mobileLayout?: "pages" | "summary";
}

const getPageItems = (currentPage: number, totalPages: number): Array<number | "ellipsis"> => {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
};

/** One pagination design for table, card, and notification footers. */
export const PaginationControls = ({ currentPage, totalPages, onPageChange, className, variant = "floating", mobileLayout = "pages" }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pages = getPageItems(page, totalPages);
  const buttonClass = "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <nav aria-label="Pagination" className={cn("flex w-full items-center justify-end pt-3", mobileLayout === "summary" && "gw-pagination", variant === "table" && "bg-card px-4 pb-3", className)}>
      {mobileLayout === "summary" && (
        <div className="gw-pagination-mobile w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border/80 bg-card p-2">
          <Button type="button" variant="outline" className="size-11 shrink-0 rounded-lg p-0" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="min-w-0 text-center text-xs text-muted-foreground tabular-nums" aria-live="polite" aria-atomic="true">
            Page <span className="font-semibold text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <Button type="button" variant="outline" className="size-11 shrink-0 rounded-lg p-0" aria-label="Next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
      <div className={cn("flex items-center gap-1.5", mobileLayout === "summary" && "gw-pagination-desktop")}>
        <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}
          className={cn(buttonClass, "gw-action-ghost text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-35")}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        {pages.map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} aria-hidden="true" className="hidden size-9 items-center justify-center text-xs text-muted-foreground sm:flex">…</span>
        ) : (
          <button key={item} type="button" aria-label={`Page ${item}`} aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(buttonClass, totalPages > 3 && item !== page && "hidden sm:flex",
              item === page ? "border border-primary/35 bg-primary/10 font-semibold text-primary" : "gw-action-ghost text-muted-foreground hover:text-foreground")}>
            {item}
          </button>
        ))}
        <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}
          className={cn(buttonClass, "gw-action-ghost text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-35")}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </nav>
  );
};

export default PaginationControls;
