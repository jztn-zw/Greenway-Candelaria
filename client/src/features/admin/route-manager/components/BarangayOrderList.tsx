import React, { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Info,
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RouteForm } from "../hooks/useRoutes";
import type { Barangay } from "../hooks/useBarangays";

interface BarangayOrderListProps {
  form: RouteForm;
  barangaySearch: string;
  setBarangaySearch: (v: string) => void;
  availableBarangays: Barangay[];
  isLoadingBarangays: boolean;
  onAdd: (b: { id: string; name: string }) => void;
  onRemove: (id: string) => void;
  onMove: (idx: number, direction: "up" | "down") => void;
  onReorder?: (sourceIdx: number, targetIdx: number) => void;
}

export const BarangayOrderList: React.FC<BarangayOrderListProps> = ({
  form,
  barangaySearch,
  setBarangaySearch,
  availableBarangays,
  isLoadingBarangays,
  onAdd,
  onRemove,
  onMove,
  onReorder,
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragItemRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx((prev) => (prev === idx ? prev : idx));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIdx: number) => {
      e.preventDefault();
      const sourceIdx = dragItemRef.current;
      if (sourceIdx !== null && sourceIdx !== targetIdx) {
        if (onReorder) {
          onReorder(sourceIdx, targetIdx);
        } else {
          if (sourceIdx < targetIdx) {
            for (let i = sourceIdx; i < targetIdx; i++) {
              onMove(i, "down");
            }
          } else {
            for (let i = sourceIdx; i > targetIdx; i--) {
              onMove(i, "up");
            }
          }
        }
      }
      setDragIdx(null);
      setOverIdx(null);
      dragItemRef.current = null;
    },
    [onReorder, onMove]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    dragItemRef.current = null;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-xs font-bold text-foreground">
            Collection Sequence & Stops <span className="text-destructive">*</span>
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Order in which the assigned truck will collect waste.
          </p>
        </div>
        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 tabular-nums">
          {form.barangays.length} stops
        </span>
      </div>

      {/* Search to Add */}
      <div className="relative">
        {isLoadingBarangays ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Input
          aria-label="Search barangays to add to this route"
          placeholder={isLoadingBarangays ? "Loading barangays..." : "Search barangay name to add..."}
          value={barangaySearch}
          onChange={(e) => setBarangaySearch(e.target.value)}
          disabled={isLoadingBarangays}
          className="pl-9 h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20"
        />
        {barangaySearch && (
          <button
            type="button"
            onClick={() => setBarangaySearch("")}
            aria-label="Clear barangay search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {barangaySearch && availableBarangays.length > 0 && (
        <div className="border border-border/80 rounded-xl max-h-40 overflow-y-auto bg-popover shadow-lg divide-y divide-border/60">
          {availableBarangays.slice(0, 8).map((b) => (
            <button
              type="button"
              key={b.id}
              onClick={() => onAdd({ id: b.id, name: b.name })}
              className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-muted/70 transition-colors flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-semibold truncate">{b.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {b.zone && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-mono">
                    Zone {b.zone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                  <Plus className="w-3 h-3" /> Add
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {barangaySearch && !isLoadingBarangays && availableBarangays.length === 0 && (
        <p className="text-xs text-muted-foreground px-1 italic">
          No matching unassigned barangays found.
        </p>
      )}

      {/* Ordered Stops Container */}
      <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/70 max-h-56 overflow-y-auto bg-background/50">
        {form.barangays.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">No stops added yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Use the search box above to add collection stops in the order they should be visited.
            </p>
          </div>
        ) : (
          form.barangays.map((b, idx) => (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 group transition-all select-none relative",
                dragIdx === idx && "opacity-30 bg-muted/60 scale-[0.99]",
                overIdx === idx &&
                  dragIdx !== null &&
                  dragIdx !== idx &&
                  (dragIdx > idx
                    ? "bg-primary/10 border-t-2 border-t-primary"
                    : "bg-primary/10 border-b-2 border-b-primary"),
                dragIdx === null && "hover:bg-muted/40 cursor-grab active:cursor-grabbing"
              )}
            >
              {/* Order index pill */}
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-extrabold font-mono">{idx + 1}</span>
              </div>

              {/* Barangay Name */}
              <span className="text-xs font-bold text-foreground flex-1 truncate">{b.name}</span>

              {/* Up/Down buttons for accessible mobile/tablet reordering */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(idx, "up")}
                  disabled={idx === 0}
                  className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                  title="Move stop up"
                  aria-label={`Move ${b.name} up`}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(idx, "down")}
                  disabled={idx === form.barangays.length - 1}
                  className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                  title="Move stop down"
                  aria-label={`Move ${b.name} down`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Remove button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(b.id)}
                className="w-6 h-6 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title={`Remove ${b.name}`}
                aria-label={`Remove ${b.name} from route`}
              >
                <X className="w-3.5 h-3.5" />
              </Button>

              {/* Drag handle */}
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 cursor-grab active:cursor-grabbing hover:text-foreground transition-colors" />
            </div>
          ))
        )}
      </div>

      {/* Helper notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
        <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Order determines the truck's navigation sequence and ETA calculation for resident notifications.
        </p>
      </div>
    </div>
  );
};

export default BarangayOrderList;
