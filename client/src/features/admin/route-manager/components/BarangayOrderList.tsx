import React, { useRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Search,
  X,
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-xs font-bold text-foreground">
            Collection Sequence & Stops
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Order in which the assigned truck will visit barangays.
          </p>
        </div>
        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 tabular-nums">
          {form.barangays.length} {form.barangays.length === 1 ? "stop" : "stops"}
        </span>
      </div>

      {/* ── Combobox Input: Click to browse ALL barangays + Search to filter ── */}
      <div ref={dropdownRef} className="relative">
        <div className="relative">
          {isLoadingBarangays ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          )}

          <Input
            aria-label="Search or browse barangays to add"
            placeholder={
              isLoadingBarangays
                ? "Loading barangays..."
                : "Click to browse all barangays or type to search..."
            }
            value={barangaySearch}
            onFocus={() => setIsDropdownOpen(true)}
            onClick={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setBarangaySearch(e.target.value);
              setIsDropdownOpen(true);
            }}
            disabled={isLoadingBarangays}
            className="pl-9 pr-16 h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus-visible:ring-primary/20"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {barangaySearch && (
              <button
                type="button"
                onClick={() => setBarangaySearch("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="Toggle all barangays list"
              className="text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
            >
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>

        {/* ── Floating Dropdown: Shows ALL Available Barangays ── */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-border/80 bg-popover shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Dropdown Header */}
            <div className="px-3.5 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Available Barangays in Candelaria
              </span>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60 tabular-nums">
                {availableBarangays.length} available
              </span>
            </div>

            {/* Scrollable list of ALL available barangays */}
            <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
              {isLoadingBarangays ? (
                <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading barangays...</span>
                </div>
              ) : availableBarangays.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                  {barangaySearch ? (
                    <>
                      <p className="font-semibold text-foreground">No matching barangays</p>
                      <p className="text-[11px]">No available barangay matches "{barangaySearch}"</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-foreground">All barangays added</p>
                      <p className="text-[11px]">All barangays are assigned to this route or scheduled on this day.</p>
                    </>
                  )}
                </div>
              ) : (
                availableBarangays.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => {
                      onAdd({ id: b.id, name: b.name });
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-foreground hover:bg-primary/5 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <span className="font-semibold truncate group-hover:text-primary transition-colors">
                        {b.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.zone && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-mono">
                          Zone {b.zone}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground px-2 py-0.5 rounded-md transition-all shadow-2xs">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Collection Sequence: Ordered Stops List ── */}
      <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 max-h-64 sm:max-h-72 overflow-y-auto bg-background/50 shadow-2xs">
        {form.barangays.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">No collection stops assigned yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Click the search box above to browse all available barangays and add them in collection order.
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
              {/* Order index badge */}
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-extrabold font-mono">{idx + 1}</span>
              </div>

              {/* Barangay Name */}
              <span className="text-xs font-bold text-foreground flex-1 truncate">{b.name}</span>

              {/* Up/Down buttons */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(idx, "up")}
                  disabled={idx === 0}
                  className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 cursor-pointer"
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
                  className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 cursor-pointer"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BarangayOrderList;
