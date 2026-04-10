import { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  GripVertical,
  Search,
  X,
  Info,
  Loader2,
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
}

const BarangayOrderList = ({
  form,
  barangaySearch,
  setBarangaySearch,
  availableBarangays,
  isLoadingBarangays,
  onAdd,
  onRemove,
  onMove,
}: BarangayOrderListProps) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    dragItemRef.current = idx;
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const handleDrop = useCallback((targetIdx: number) => {
    const sourceIdx = dragItemRef.current;
    if (sourceIdx === null || sourceIdx === targetIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    // Move step by step from source to target
    if (sourceIdx < targetIdx) {
      for (let i = sourceIdx; i < targetIdx; i++) {
        onMove(i, "down");
      }
    } else {
      for (let i = sourceIdx; i > targetIdx; i--) {
        onMove(i, "up");
      }
    }
    setDragIdx(null);
    setOverIdx(null);
    dragItemRef.current = null;
  }, [onMove]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    dragItemRef.current = null;
  }, []);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">
        Barangay Order ({form.barangays.length} selected)
      </Label>

      {/* Search + add */}
      <div className="relative">
        {isLoadingBarangays ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Input
          placeholder={isLoadingBarangays ? "Loading barangays..." : "Search barangays to add..."}
          value={barangaySearch}
          onChange={(e) => setBarangaySearch(e.target.value)}
          disabled={isLoadingBarangays}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {barangaySearch && availableBarangays.length > 0 && (
        <div className="border border-border rounded-md max-h-32 overflow-y-auto bg-popover shadow-md">
          {availableBarangays.slice(0, 8).map((b) => (
            <button
              key={b.id}
              onClick={() => onAdd({ id: b.id, name: b.name })}
              className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3 text-primary shrink-0" />
              <span>{b.name}</span>
              {b.zone && (
                <span className="text-[10px] text-muted-foreground ml-auto">Zone {b.zone}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {barangaySearch && !isLoadingBarangays && availableBarangays.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">No matching barangays found.</p>
      )}

      {/* Ordered list with drag-and-drop */}
      <div className="border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
        {form.barangays.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No barangays added yet. Use the search above to add barangays in order.
          </div>
        ) : (
          form.barangays.map((b, idx) => (
            <div
              key={b.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 px-3 py-2 group transition-colors select-none",
                dragIdx === idx && "opacity-40",
                overIdx === idx && dragIdx !== idx && "bg-primary/10 border-primary/20",
                dragIdx === null && "hover:bg-muted/30"
              )}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
              </div>
              <span className="text-xs text-foreground flex-1">{b.name}</span>
              <button onClick={() => onRemove(b.id)} className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40">
        <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Drag and drop barangays to reorder. The order determines the truck's collection sequence and directly affects the estimated time of arrival shown to residents.
        </p>
      </div>
    </div>
  );
};

export default BarangayOrderList;
