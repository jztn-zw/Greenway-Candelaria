import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowDownUp, Loader2, MapPin, Minus, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
  const [matched, setMatched] = useState({ points: initial.points, path: initial.path, attempt: 0, error: "", roadMatched: false });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const matchIsCurrent = matched.points === points && matched.attempt === retry;
  const routing = points.length >= 2 && !matchIsCurrent;
  const routeError = matchIsCurrent ? matched.error : "";
  const geometry = matchIsCurrent ? matched.path : EMPTY_PATH;

  useEffect(() => {
    setPoints(initial.points);
    setMatched({ points: initial.points, path: initial.path, attempt: 0, error: "", roadMatched: false });
    setRetry(0);
    setError("");
  }, [initial, open]);

  useEffect(() => {
    if (!open || (matched.points === points && matched.attempt === retry)) return;
    if (points.length < 2) {
      setMatched({ points, path: [], attempt: retry, error: "", roadMatched: false });
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
        setMatched({ points: result.snappedPoints, path, attempt: retry, error: "", roadMatched: true });
      } catch (routeFailure) {
        if (!controller.signal.aborted) {
          setMatched({ points, path: [], attempt: retry, error: routeFailure instanceof Error ? routeFailure.message : "Road matching is unavailable. Please try again.", roadMatched: false });
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
    setMapReady(true);

    return () => {
      window.clearTimeout(resizeTimer);
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
      setError(saveError instanceof Error ? saveError.message : "Could not save the street path.");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="flex max-h-[94dvh] w-[min(96vw,68rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2 font-display text-base font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </span>
            Draw street coverage
          </DialogTitle>
          <DialogDescription className="text-xs">
            {streetName}{barangayName ? ` · Brgy. ${barangayName}` : ""}. Click points in collection order. The line follows roads; add points to guide turns or drag a number to adjust.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {routing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <span className={cn("h-2 w-2 rounded-full", routeError ? "bg-destructive" : points.length >= 2 ? "bg-primary" : "bg-amber-500")} />}
              {points.length === 0 ? "No path saved" : points.length === 1 ? "Add one more point" : routing ? "Matching roads…" : routeError ? "Road matching failed" : `${points.length} marked points · ${matched.roadMatched ? "Road path ready" : "Saved path"}`}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={undoPoint} disabled={!points.length || saving}>
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={reversePath} disabled={points.length < 2 || saving}>
                <ArrowDownUp className="h-3.5 w-3.5" /> Reverse
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={clearPath} disabled={!points.length || saving}>
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>

          <div className="street-coverage-map relative isolate h-[min(55vh,34rem)] min-h-[20rem] overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-inner">
            <div ref={setMapContainer} className="h-full w-full" aria-label={`Map for ${streetName} street coverage`} />
            {!mapReady && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/70 text-xs text-muted-foreground backdrop-blur-[1px]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
              </div>
            )}
            <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-lg border border-border/70 bg-card/95 px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
              Click to mark · drag to adjust
            </div>
            <div className="absolute right-3 top-3 z-[400] flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/90 p-0.5 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={zoomIn}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted hover:text-primary"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="mx-1 h-px bg-border/70" />
              <button
                type="button"
                onClick={zoomOut}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted hover:text-primary"
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

          {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
          {routeError && (
            <div className="flex items-center justify-between gap-3" role="alert">
              <p className="text-xs font-medium text-destructive">{routeError}</p>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-lg text-xs" onClick={() => setRetry((current) => current + 1)}>Retry</Button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-muted/10 px-4 py-3 sm:px-5">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            Scheduled routes use saved edits. Started routes keep their map history; paths used by active routes cannot be cleared.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button type="button" className="h-9 gap-2 rounded-xl" onClick={() => void savePath()} disabled={saving || routing || Boolean(routeError) || points.length === 1 || geometry.length > 500}>
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
