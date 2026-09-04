import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, History, ShieldCheck, Sparkles } from "lucide-react";
import type { CollectionHistoryEntry } from "./types";
import { cn } from "@/lib/utils";

interface CollectionHistoryProps {
  history: CollectionHistoryEntry[];
}

const CollectionHistory = ({ history }: CollectionHistoryProps) => {
  const [expanded, setExpanded] = useState(false);

  const completedCount = history.filter((e) => e.status === "completed").length;
  const reliabilityRate =
    history.length > 0 ? Math.round((completedCount / history.length) * 100) : 100;

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3.5 sm:px-4 py-3 sm:py-3.5 text-left hover:bg-muted/30 transition-colors cursor-pointer select-none gap-2"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <p className="text-xs sm:text-sm font-display font-bold text-foreground whitespace-nowrap">
                Collection History
              </p>
              {history.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap shrink-0">
                  {reliabilityRate}% Reliability
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
              {history.length > 0
                ? `${completedCount} of ${history.length} scheduled pickups completed in your area`
                : "No past collections logged yet"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-xs font-semibold text-muted-foreground">
            {expanded ? "Hide Details" : "View History"}
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/70 divide-y divide-border/60 bg-muted/10 animate-in fade-in-50 duration-200">
          {history.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-muted-foreground">
              No historical collection runs recorded for your barangay yet.
            </div>
          ) : (
            history.map((entry, i) => {
              const isCompleted = entry.status === "completed";
              const isBio = entry.wasteType?.toLowerCase().includes("bio");
              const isNonBio =
                entry.wasteType?.toLowerCase().includes("non-bio") ||
                entry.wasteType?.toLowerCase().includes("recycl");

              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
                        isCompleted
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">
                        {entry.date}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.2 rounded-md border",
                            isBio &&
                              "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                            isNonBio &&
                              "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
                            !isBio &&
                              !isNonBio &&
                              "bg-muted text-muted-foreground border-border/60"
                          )}
                        >
                          {entry.wasteType || "General Waste"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0",
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                  >
                    {isCompleted ? "Collected" : "Missed"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionHistory;
