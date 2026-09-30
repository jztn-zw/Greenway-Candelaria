import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isAxiosError } from "axios";
import { AlertTriangle, ArrowDownUp, CheckCircle2, Info, Loader2, MapPin, Minus, MousePointer2, Plus, RefreshCw, Save, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStreetCoverageRoadPath } from "@/services/roadRoutingService";

export type CoveragePoint = [number, number];

interface StreetCoverageEditorProps {
  open: boolean;
  streetName: string;
  barangayName: string;
  initialPath: CoveragePoint[] | null;
  center: CoveragePoint | null;
  onOpenChange: (open: boolean) => void;
  onSave: (path: CoveragePoint[] | null) => Promise<void>;
}

const DEFAULT_CENTER: CoveragePoint = [13.931, 121.424];
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAX_MARKED_POINTS = 100;
const EMPTY_PATH: CoveragePoint[] = [];

interface RoadMatchingFailure {
  title: string;
  description: string;
}

const describeRoadMatchingFailure = (error: unknown): RoadMatchingFailure => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 500) {
      return { title: "Road matching is temporarily unavailable", description: "The road service couldn't complete this request. Try again in a moment." };
    }
    if (status === 429) {
      return { title: "Road matching is busy", description: "Wait a moment before trying again." };
    }
    if (!error.response) {
      return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
        ? { title: "Road matching took too long", description: "The request timed out. Check your connection and try again." }
        : { title: "Couldn't connect to the road service", description: "Check your connection and try again." };
    }
    if (status === 400 || status === 422) {
      return { title: "Adjust the marked points", description: error.message };
    }
  }
  return {
    title: "Couldn't match the street path",
    description: error instanceof Error ? error.message : "Try again, or move the points closer to the street.",
  };
};

const simplifyPoints = (path: CoveragePoint[], toleranceMeters: number): CoveragePoint[] => {
  const projected = path.map((point) => L.CRS.EPSG3857.project(L.latLng(point)));
  return L.LineUtil.simplify(projected, toleranceMeters).map((point) => path[projected.indexOf(point)]);
};

// A saved road geometry can have hundreds of vertices. Show a few draggable
// control points while retaining the full saved shape until the user edits it.
const editablePoints = (path: CoveragePoint[]): CoveragePoint[] => {
  if (path.length <= 20) return path;
  let tolerance = 2;
  let controls = simplifyPoints(path, tolerance);
  while (controls.length > MAX_MARKED_POINTS) {
    tolerance *= 2;
    controls = simplifyPoints(path, tolerance);
  }
  return controls;
};

const StreetCoverageEditor = ({
  open,
  streetName,
  barangayName,
  initialPath,
  center,
  onOpenChange,
  onSave,
}: StreetCoverageEditorProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const initialViewRef = useRef({ initialPath, center });
  const pointsLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const initial = useMemo(() => ({ points: editablePoints(initialPath ?? []), path: initialPath ?? [] }), [initialPath]);
  const [points, setPoints] = useState<CoveragePoint[]>(initial.points);
  const [retry, setRetry] = useState(0);
  const [matched, setMatched] = useState({ points: initial.points, path: initial.path, attempt: 0, error: null as RoadMatchingFailure | null, roadMatched: false });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const matchIsCurrent = matched.points === points && matched.attempt === retry;
  const routing = points.length >= 2 && !matchIsCurrent;
  const routeError = matchIsCurrent ? matched.error : null;
  const geometry = matchIsCurrent ? matched.path : EMPTY_PATH;
  const statusLabel = points.length === 0 ? "No path saved" : points.length === 1 ? "Add one more point" : routing ? "Matching roads…" : routeError ? "Road matching paused" : matched.roadMatched ? "Road path ready" : "Saved path";
  const statusHint = points.length === 0 ? "Click the map to mark the first collection point." : points.length === 1 ? "Mark the next point along the street." : routing ? "Finding the road path between your points." : routeError ? "You can still move or add points to adjust the path." : "Points follow the collection order. Drag a number to adjust.";

  useEffect(() => {
    setPoints(initial.points);
    setMatched({ points: initial.points, path: initial.path, attempt: 0, error: null, roadMatched: false });
    setRetry(0);
    setError("");
  }, [initial, open]);

  useEffect(() => {
    if (!open || (matched.points === points && matched.attempt === retry)) return;
    if (points.length < 2) {
      setMatched({ points, path: [], attempt: retry, error: null, roadMatched: false });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await getStreetCoverageRoadPath(points, controller.signal);
        if (controller.signal.aborted) return;
        const path = result.coordinates.length > 500 ? simplifyPoints(result.coordinates, 0.25) : result.coordinates;
        if (path.length > 500) throw new Error("This path is too long. Draw a shorter street section.");
        // Update pins and the road geometry together so snapped positions do
        // not start another request, and the save always uses this preview.
        setPoints(result.snappedPoints);
        setMatched({ points: result.snappedPoints, path, attempt: retry, error: null, roadMatched: true });
      } catch (routeFailure) {
        if (!controller.signal.aborted) {
          setMatched({ points, path: [], attempt: retry, error: describeRoadMatchingFailure(routeFailure), roadMatched: false });
        }
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, points, retry, matched]);

  useEffect(() => {
    // Dialog content is rendered through a portal. A ref assignment alone does
    // not re-run an effect, so keep the mounted map element in state before
    // creating Leaflet. Otherwise the first effect can run before the dialog
    // body exists and leave the editor permanently on "Loading map…".
    if (!open || !mapContainer || mapRef.current) return;

    const map = L.map(mapContainer, {
      zoomControl: false,
      minZoom: 13,
      maxZoom: 20,
      maxBounds: [[13.82, 121.2], [14.23, 121.66]],
      maxBoundsViscosity: 0.75,
      attributionControl: false,
    });
    mapRef.current = map;
    pointsLayerRef.current = L.layerGroup().addTo(map);
    L.tileLayer(TILE_URL, {
      maxZoom: 20,
    }).addTo(map);
    const initialView = initialViewRef.current;
    map.setView((initialView.initialPath?.[0] ?? initialView.center ?? DEFAULT_CENTER) as L.LatLngExpression, initialView.initialPath?.length ? 17 : 16);

    const addPoint = (event: L.LeafletMouseEvent) => {
      if (savingRef.current) return;
      setPoints((current) => current.length >= MAX_MARKED_POINTS
        ? current
        : [...current, [event.latlng.lat, event.latlng.lng]]);
      setError("");
    };
    map.on("click", addPoint);
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => map.invalidateSize());
    resizeObserver?.observe(mapContainer);
    setMapReady(true);

    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      map.off("click", addPoint);
      map.remove();
      mapRef.current = null;
      pointsLayerRef.current = null;
      setMapReady(false);
    };
  }, [open, mapContainer]);

  useEffect(() => {
    const layer = pointsLayerRef.current;
    if (!mapReady || !layer) return;
    layer.clearLayers();

    if (geometry.length > 1) {
      L.polyline(geometry, {
        color: "#10b981",
        weight: 7,
        opacity: 0.28,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);
      L.polyline(geometry, {
        color: "#059669",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);
    }

    points.forEach((point, index) => {
      const marker = L.marker(point, {
        draggable: !saving,
        icon: L.divIcon({
          className: "!border-0 !bg-transparent",
          html: `<span class="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] font-bold text-primary-foreground shadow-md">${index + 1}</span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        zIndexOffset: 500 + index,
      }).addTo(layer);
      marker.on("click", (event) => L.DomEvent.stopPropagation(event));
      marker.on("dragend", () => {
        if (savingRef.current) return;
        const moved = marker.getLatLng();
        setPoints((current) => current.map((coordinate, pointIndex) =>
          pointIndex === index ? [moved.lat, moved.lng] : coordinate,
        ));
        setError("");
      });
    });
  }, [mapReady, points, geometry, saving]);

  const undoPoint = useCallback(() => {
    setPoints((current) => current.slice(0, -1));
    setError("");
  }, []);

  const reversePath = useCallback(() => {
    setPoints((current) => current.slice().reverse());
    setError("");
  }, []);

  const clearPath = useCallback(() => {
    setPoints([]);
    setError("");
  }, []);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  const savePath = async () => {
    if (savingRef.current || routing || routeError) return;
    if (points.length === 1) {
      setError("Add at least one more point to create a street path.");
      return;
    }
    if (geometry.length > 500) {
      setError("A street path can contain at most 500 points.");
      return;
    }
    if (points.length >= 2 && geometry.length < 2) return;
    if (points.length >= 2 && points.every((point) => point[0] === points[0][0] && point[1] === points[0][1])) {
      setError("Choose at least two different points for the street path.");
      return;
    }
    setSaving(true);
    savingRef.current = true;
    setError("");
    try {
      await onSave(points.length ? geometry : null);
      onOpenChange(false);
    } catch (saveError) {
      setError(isAxiosError(saveError) && (!saveError.response || saveError.response.status >= 500)
        ? "We couldn't save your path right now. Your changes are kept in this window. Please try Save path again."
        : saveError instanceof Error ? saveError.message : "Could not save the street path.");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="flex h-[min(92dvh,48rem)] max-h-[92dvh] w-[min(96vw,68rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-background p-0 text-left shadow-2xl [&>button:last-child]:right-4 [&>button:last-child]:top-5 [&>button:last-child]:flex [&>button:last-child]:size-8 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-lg [&>button:last-child]:text-muted-foreground [&>button:last-child]:opacity-100 [&>button:last-child]:transition-colors [&>button:last-child]:hover:bg-muted/80 [&>button:last-child]:hover:text-foreground [&>button:last-child]:data-[state=open]:bg-transparent">
        <DialogHeader className="gw-modal-header shrink-0 space-y-0 border-b border-border/60 px-4 py-4 pr-14 text-left sm:px-5 sm:pr-14 bg-card">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display text-base font-semibold tracking-tight text-foreground">Draw street coverage</DialogTitle>
              <DialogDescription className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">
                {streetName}{barangayName ? ` · Brgy. ${barangayName}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4 scrollbar-thin sm:px-5">
          {error && (
            <div role="alert" className="flex shrink-0 gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="text-xs font-semibold text-foreground">Path wasn't saved</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
          {routeError && (
            <div className="flex shrink-0 flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{routeError.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{routeError.description}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Your marked points are kept while this window stays open.</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 self-start rounded-lg text-xs sm:self-center" onClick={() => setRetry((current) => current + 1)}><RefreshCw className="size-3.5" /> Retry</Button>
            </div>
          )}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border/80 bg-card p-3 shadow-2xs sm:px-3.5">
            <div className="min-w-0" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {routing ? <Loader2 className="size-4 animate-spin text-primary" /> : routeError ? <AlertTriangle className="size-4 text-destructive" /> : geometry.length > 1 ? <CheckCircle2 className="size-4 text-primary" /> : <span className="mx-1 size-2 rounded-full bg-muted-foreground/60" />}
                <span>{statusLabel}</span>
                {points.length > 0 && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{points.length} / {MAX_MARKED_POINTS} points</span>}
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{statusHint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Edit collection points">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-border/80 bg-background px-3 text-xs font-medium shadow-2xs" onClick={undoPoint} disabled={!points.length || saving}>
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-border/80 bg-background px-3 text-xs font-medium shadow-2xs" onClick={reversePath} disabled={points.length < 2 || saving}>
                <ArrowDownUp className="h-3.5 w-3.5" /> Reverse
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={clearPath} disabled={!points.length || saving}>
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>

          <div className="street-coverage-map relative isolate min-h-[14rem] flex-1 overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-2xs">
            <div ref={setMapContainer} className="h-full w-full" aria-label={`Map for ${streetName} street coverage`} />
            {!mapReady && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/70 text-xs text-muted-foreground backdrop-blur-[1px]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
              </div>
            )}
            <div className="pointer-events-none absolute left-2.5 top-2.5 z-[400] flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-lg border border-border/80 bg-background/95 px-2.5 py-2 text-[10px] font-medium leading-4 text-foreground shadow-sm sm:left-3 sm:top-3 sm:text-[11px]">
              <MousePointer2 className="size-3.5 shrink-0 text-primary" />
              {points.length >= MAX_MARKED_POINTS ? "Point limit reached · drag to adjust" : "Click in collection order · drag to adjust"}
            </div>
            <div className="absolute right-2.5 top-2.5 z-[400] flex flex-col overflow-hidden rounded-xl border border-border/80 bg-background/95 p-0.5 shadow-sm sm:right-3 sm:top-3">
              <button
                type="button"
                onClick={zoomIn}
                className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="mx-1 h-px bg-border/70" />
              <button
                type="button"
                onClick={zoomOut}
                className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-1.5 right-2 z-[400] text-[9px] leading-none text-muted-foreground/70 transition-colors hover:text-primary"
            >
              © OpenStreetMap
            </a>
          </div>

        </div>

        <div className="gw-modal-footer flex shrink-0 flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 bg-card">
          <div className="flex max-w-lg items-start gap-2 text-[11px] leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p>Changes apply to scheduled routes. Started routes keep their map history. Paths used by active routes cannot be cleared.</p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2.5">
            <Button type="button" variant="outline" className="h-9 flex-1 rounded-xl border-border/80 px-4 text-xs font-medium sm:flex-none" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button type="button" className="h-9 flex-1 gap-1.5 rounded-xl px-5 text-xs font-bold shadow-sm sm:flex-none" onClick={() => void savePath()} disabled={saving || routing || Boolean(routeError) || points.length === 1 || geometry.length > 500}>
              {saving || routing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : routing ? "Matching roads…" : "Save path"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreetCoverageEditor;
