import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  className?: string;
  variant?: "table" | "floating";
}

/** Shared pagination footer supporting both integrated table caps and floating pagination. */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  itemLabel = "items",
  onPageChange,
  className,
  variant = "table",
}) => {
  if (totalPages <= 1) return null;

  const start =
    totalItems != null && totalItems > 0
      ? (currentPage - 1) * pageSize + 1
      : null;
  const end =
    totalItems != null ? Math.min(currentPage * pageSize, totalItems) : null;

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (currentPage > 3) pages.push("...");
    const s = Math.max(2, currentPage - 1);
    const e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    if (!pages.includes(totalPages)) pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  return (
    <div
      className={cn(
        variant === "table"
          ? "px-4 py-3 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-card"
          : "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3",
        className
      )}
    >
      {/* Left: Contextual count */}
      <div className="text-xs text-muted-foreground order-2 sm:order-1">
        {totalItems != null && start != null && end != null ? (
          <>
            Showing{" "}
            <span className="font-semibold text-foreground font-mono">
              {start}–{end}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground font-mono">
              {totalItems}
            </span>{" "}
            {itemLabel}
          </>
        ) : (
          <>
            Page{" "}
            <span className="font-semibold text-foreground font-mono">
              {currentPage}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground font-mono">
              {totalPages}
            </span>
          </>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground font-mono"
                >
                  …
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={cn(
                  "h-8 min-w-[32px] px-2 text-xs font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center select-none",
                  isCurrent
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
