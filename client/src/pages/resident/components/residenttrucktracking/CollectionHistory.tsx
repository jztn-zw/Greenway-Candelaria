import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, History } from "lucide-react";
import type { CollectionHistoryEntry } from "./types";
import { cn } from "@/lib/utils";

interface CollectionHistoryProps {
  history: CollectionHistoryEntry[];
}

const CollectionHistory = ({ history }: CollectionHistoryProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-foreground">Collection History</p>
            <p className="text-[11px] text-muted-foreground">Last {history.length} collections</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="border-t border-border">
          {history.map((entry, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between px-4 py-2.5",
                i !== history.length - 1 && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  entry.status === "completed" ? "bg-primary/10" : "bg-destructive/10"
                )}>
                  {entry.status === "completed"
                    ? <Check className="w-3.5 h-3.5 text-primary" />
                    : <X className="w-3.5 h-3.5 text-destructive" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{entry.date}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.wasteType}</p>
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                entry.status === "completed"
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}>
                {entry.status === "completed" ? "Collected" : "Missed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionHistory;
