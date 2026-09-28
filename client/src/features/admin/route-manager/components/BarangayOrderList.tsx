import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BarangayStreetRow } from "@/services/barangaysService";
import type { RouteForm } from "../hooks/useRoutes";
import type { Barangay } from "../hooks/useBarangays";

interface BarangayOrderListProps {
  form: RouteForm;
  barangays: Barangay[];
  availableStopPoints: BarangayStreetRow[];
  isLoadingBarangays: boolean;
  isLoadingStopPoints: boolean;
  isCollectionAvailable: boolean;
  onSelectBarangay: (barangayId: string) => void;
  onAdd: (point: BarangayStreetRow) => void;
  onAddAll?: (points: BarangayStreetRow[]) => void;
  onClearAll?: () => void;
  onRemove: (id: string) => void;
  onMove: (idx: number, direction: "up" | "down") => void;
  onReorder?: (sourceIdx: number, targetIdx: number) => void;
  error?: string;
}

export const BarangayOrderList: React.FC<BarangayOrderListProps> = ({
  form,
  barangays,
  availableStopPoints,
  isLoadingBarangays,
  isLoadingStopPoints,
  isCollectionAvailable,
  onSelectBarangay,
  onAdd,
  onAddAll,
  onClearAll,
  onRemove,
  onMove,
  onReorder,
  error,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [streetFilter, setStreetFilter] = useState("");

  const handleDrop = useCallback(
    (event: React.DragEvent, targetIndex: number) => {
      event.preventDefault();
      if (dragIndex !== null && dragIndex !== targetIndex) {
        onReorder?.(dragIndex, targetIndex);
      }
      setDragIndex(null);
    },
    [dragIndex, onReorder]
  );

  const filteredAvailable = useMemo(() => {
    if (!streetFilter.trim()) return availableStopPoints;
    const q = streetFilter.toLowerCase().trim();
    return availableStopPoints.filter((p) =>
      `${p.name} ${p.area ?? ""}`.toLowerCase().includes(q)
    );
  }, [availableStopPoints, streetFilter]);

  const handleAddAll = () => {
    if (onAddAll) {
      onAddAll(filteredAvailable);
    } else {
      filteredAvailable.forEach((point) => onAdd(point));
    }
  };

  const selectedBarangay = barangays.find((b) => b.id === form.selectedBarangayId);

  return (
    <div className="space-y-4" aria-label="Street collection stops">
      {/* ── Street Selector Box ── */}
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            Pick Barangay & Add Streets
          </Label>
          {selectedBarangay && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {availableStopPoints.length} available to add
            </span>
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Barangay Dropdown */}
          <div className="grid grid-rows-[1.25rem_auto] gap-1">
            <span className="flex h-5 items-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Barangay
            </span>
            <SearchableSelect
              value={form.selectedBarangayId}
              onValueChange={(val) => {
                setStreetFilter("");
                onSelectBarangay(val);
              }}
              disabled={isLoadingBarangays}
              options={barangays.map((barangay) => ({ value: barangay.id, label: barangay.name }))}
              placeholder={isLoadingBarangays ? "Loading barangays..." : "Select a barangay"}
              searchPlaceholder="Search barangays..."
              leadingIcon={<MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              className="h-10 rounded-xl border-border/80 bg-background text-xs shadow-2xs focus:ring-primary/20"
            />
          </div>

          {/* Available Streets Selector */}
          <div className="grid grid-rows-[1.25rem_auto] gap-1">
            <div className="flex h-5 items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available Streets
              </span>
              {filteredAvailable.length > 0 && isCollectionAvailable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddAll}
                  className="h-5 px-1.5 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10 rounded cursor-pointer"
                  title="Add all listed streets to route"
                >
                  + Add All ({filteredAvailable.length})
                </Button>
              )}
            </div>

            <div
              className={cn(
                "min-h-9 rounded-xl border border-border/80 bg-background/70 p-2 shadow-2xs",
                (!form.selectedBarangayId ||
                  isLoadingStopPoints ||
                  !isCollectionAvailable ||
                  availableStopPoints.length === 0) &&
                  "flex h-10 items-center px-3 py-0",
              )}
            >
              {!form.selectedBarangayId ? (
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  Select a barangay first to see streets.
                </p>
              ) : isLoadingStopPoints ? (
                <p className="flex min-w-0 items-center gap-2 truncate text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading streets…
                </p>
              ) : !isCollectionAvailable ? (
                <p
                  className="min-w-0 truncate text-xs text-amber-600 dark:text-amber-400"
                  title="Collection service is not available for this barangay yet."
                >
                  Collection is not available yet.
                </p>
              ) : availableStopPoints.length === 0 ? (
                <p
                  className="min-w-0 truncate text-xs text-muted-foreground"
                  title="All available streets are already added or scheduled."
                >
                  All available streets are already added or scheduled.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableStopPoints.length > 4 && (
                    <div className="relative">
                      <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                      <Input
                        value={streetFilter}
                        onChange={(e) => setStreetFilter(e.target.value)}
                        placeholder="Filter streets..."
                        className="h-7 text-xs pl-7 rounded-lg bg-muted/30 border-border/70"
                      />
                    </div>
                  )}

                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1 scrollbar-thin">
                    {filteredAvailable.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-muted-foreground">
                        No streets match &quot;{streetFilter}&quot;.
                      </p>
                    ) : (
                      filteredAvailable.map((point) => {
                        const label = `${point.name}${point.area ? ` (${point.area})` : ""}`;
                        const hasCoveragePath = Boolean(point.coverage_path && point.coverage_path.length >= 2);
                        return (
                          <Button
                            key={point.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAdd(point)}
                            className="h-7 gap-1 rounded-lg border-border/70 bg-card px-2.5 text-[11px] font-medium hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all cursor-pointer"
                            title={hasCoveragePath
                              ? `Add ${label} to route`
                              : `${label} needs a coverage path in Barangay Manager`}
                          >
                            <Plus className="h-3 w-3 text-emerald-500" />
                            <span>{label}</span>
                            {!hasCoveragePath && (
                              <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="Coverage path missing" />
                            )}
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Ordered Stops Sequence ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Label
              className={cn(
                "text-xs font-bold flex items-center gap-1.5",
                error ? "text-destructive" : "text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              Route Stop Sequence
            </Label>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-primary">
              {form.barangays.length} {form.barangays.length === 1 ? "stop" : "stops"}
            </span>
          </div>

          {form.barangays.length > 0 && onClearAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear Stops
            </Button>
          )}
        </div>

        {error && <p className="text-[11px] font-medium text-destructive px-1">{error}</p>}

        <div
          className={cn(
            "max-h-72 overflow-y-auto rounded-2xl border divide-y divide-border/50 bg-background/50 shadow-2xs scrollbar-thin",
            error ? "border-destructive/70" : "border-border/80"
          )}
        >
          {form.barangays.length === 0 ? (
            <div className="space-y-2 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-foreground">
                No collection stops added yet
              </p>
              <p className="mx-auto max-w-xs text-[11px] leading-relaxed text-muted-foreground">
                Select a barangay above to pick and add streets in their intended collection sequence.
              </p>
            </div>
          ) : (
            form.barangays.map((stop, index) => {
              const barangayName = barangays.find(
                (b) => b.id === stop.barangayId
              )?.name;

              return (
                <div
                  key={stop.id}
                  draggable
                  onDragStart={(event) => {
                    setDragIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 transition-colors",
                    dragIndex === index
                      ? "bg-muted/60 opacity-40"
                      : "hover:bg-muted/30"
                  )}
                >
                  <GripVertical
                    className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-grab shrink-0"
                    aria-hidden="true"
                  />

                  {/* Order Number Badge */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <span className="text-[11px] font-black tabular-nums">
                      {index + 1}
                    </span>
                  </div>

                  {/* Street Name & Barangay Badge */}
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-foreground">
                      {stop.name}
                    </span>
                    {barangayName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 shrink-0 hidden sm:inline-block">
                        {barangayName}
                      </span>
                    )}
                  </div>

                  {stop.coveragePath && stop.coveragePath.length >= 2 ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                      aria-label="Coverage path saved"
                    />
                  ) : (
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0 text-amber-500"
                      aria-label="Coverage path missing"
                    />
                  )}

                  {/* Ordering & Delete Controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onMove(index, "up")}
                      disabled={index === 0}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-20"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onMove(index, "down")}
                      disabled={index === form.barangays.length - 1}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-20"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(stop.id)}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer ml-1"
                      title="Remove stop"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BarangayOrderList;
