import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, MapPin, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import type { BarangayLocationRow, BarangayStreetRow } from "@/services/barangaysService";
import ResidentSetupMap from "./ResidentSetupMap";
import { locationMatchesStreet, nearbyStreets, streetLabel, streetLocationPoints, validLocationPoint, type ResidentSetupLocation } from "./residentLocation";

interface Props {
  barangay: BarangayLocationRow;
  streets: BarangayStreetRow[];
  streetId: string;
  value: ResidentSetupLocation | null;
  confirmed: boolean;
  disabled: boolean;
  onStreetChange: (id: string) => void;
  onChange: (value: ResidentSetupLocation | null, confirmed: boolean) => void;
}
const METHODS = [
  { value: "CURRENT_LOCATION", label: "Use Current Location", shortLabel: "Current Location", Icon: LocateFixed },
  { value: "MANUAL_PIN", label: "Pin on Map", shortLabel: "Pin on Map", Icon: MapPin },
  { value: "STREET_POINT", label: "Choose a Nearby Street Point", shortLabel: "Street Point", Icon: Route },
] as const;

export default function ResidentLocationPicker({ barangay, streets, streetId, value, confirmed, disabled, onStreetChange, onChange }: Props) {
  const [method, setMethod] = useState<ResidentSetupLocation["method"] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef(0);
  const previousStreet = useRef(streetId);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const street = streets.find(row => row.id === streetId);
  const points = streetLocationPoints(street);
  const candidates = useMemo(() => value && value.method !== "STREET_POINT" ? nearbyStreets(value, streets) : [], [value, streets]);
  const matches = locationMatchesStreet(value, street);
  const ambiguous = candidates.length > 1 && candidates[1].distance - candidates[0].distance <= Math.max(25, value?.method === "CURRENT_LOCATION" ? value.accuracyMeters : 0);
  const center: [number, number] | null = barangay.latitude != null && barangay.longitude != null
    && validLocationPoint([Number(barangay.latitude), Number(barangay.longitude)]) ? [Number(barangay.latitude), Number(barangay.longitude)] : null;

  useEffect(() => () => { request.current++; clearTimeout(timeout.current); }, []);
  useEffect(() => {
    if (previousStreet.current === streetId) return;
    previousStreet.current = streetId;
    request.current++; clearTimeout(timeout.current);
    if (locating) { setLocating(false); onChange(null, false); }
  }, [streetId, locating, onChange]);
  useEffect(() => { if (value && confirmed && !matches) onChange(value, false); }, [value, confirmed, matches, onChange]);

  const reset = (next: typeof method) => {
    request.current++; clearTimeout(timeout.current);
    if (method && next !== method) {
      previousStreet.current = "";
      onStreetChange("");
    }
    setLocating(false); setMessage(""); setMethod(next); onChange(null, false);
  };
  const locate = () => {
    if (disabled) return;
    reset("CURRENT_LOCATION");
    if (!navigator.geolocation || !window.isSecureContext) {
      setMessage("Location access isn't available here. Use a secure connection, pin on the map, or choose a nearby street point."); return;
    }
    const version = ++request.current;
    setLocating(true); onChange(null, false);
    const fail = (text: string) => {
      if (request.current !== version) return;
      request.current++; clearTimeout(timeout.current); setLocating(false); setMessage(text); onChange(null, false);
    };
    timeout.current = setTimeout(() => fail("Location took too long. Retry, pin on the map, or choose a nearby street point."), 13000);
    try {
      navigator.geolocation.getCurrentPosition(position => {
        if (request.current !== version) return;
        const { latitude, longitude, accuracy } = position.coords;
        if (!validLocationPoint([latitude, longitude]) || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000 || !Number.isFinite(position.timestamp) || Math.abs(position.timestamp) > 8.64e15) {
          fail("A usable location wasn't returned. Retry or choose another location option."); return;
        }
        const next: ResidentSetupLocation = { method: "CURRENT_LOCATION", latitude, longitude, accuracyMeters: accuracy, capturedAt: new Date(position.timestamp).toISOString() };
        if (accuracy > 50) {
          fail("Your device location is not accurate enough. Choose Pin on Map or Street Point instead."); return;
        }
        const nearby = nearbyStreets(next, streets);
        if (!nearby.length) {
          fail("Your device location could not be matched to a street in this barangay. Choose Pin on Map or Street Point instead."); return;
        }
        request.current++; clearTimeout(timeout.current); setLocating(false); setMessage("");
        if (nearby.length === 1 || nearby[1].distance - nearby[0].distance > Math.max(25, accuracy)) onStreetChange(nearby[0].street.id);
        onChange(next, false);
      }, error => fail(error.code === 1 ? "Location permission was denied. Pin on the map or choose a nearby street point instead."
        : error.code === 3 ? "Location took too long. Retry or choose another location option."
          : "Your location is unavailable. Check your device location settings or choose another option."), { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    } catch { fail("Couldn't request your location. Pin on the map or choose a nearby street point instead."); }
  };
  const selectPoint = (index: number) => {
    const point = points[index];
    if (!point || disabled) return;
    onChange({ method: "STREET_POINT", latitude: point[0], longitude: point[1], pointIndex: index }, false);
  };

  return <section aria-label="Resident location" className="mt-4 space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3 sm:p-4">
    <div><h3 className="text-sm font-semibold">Location</h3>
      <p className="mt-1 text-xs text-muted-foreground">Choose a point near your home in {barangay.name}.</p></div>
    <div role="group" aria-label="Location method" className="grid gap-2 sm:grid-cols-3">
      {METHODS.map(({ value: next, label, shortLabel, Icon }) => <Button key={next} type="button" variant={method === next ? "default" : "outline"} aria-label={label} aria-pressed={method === next} disabled={disabled} className="h-auto min-h-11 whitespace-normal px-3 py-2 text-xs" onClick={() => next === "CURRENT_LOCATION" ? locate() : reset(next)}><Icon aria-hidden="true" />{shortLabel}</Button>)}
    </div>
    {method === "STREET_POINT" && <div className="space-y-2">
      <Label htmlFor="setup-street" className="text-xs font-medium">Street</Label>
      <SearchableSelect id="setup-street" aria-label="Street" fieldSize="compact" value={streetId} onValueChange={onStreetChange}
        options={streets.map(row => ({ value: row.id, label: streetLabel(row) }))}
        placeholder={disabled ? "Loading streets…" : streets.length ? "Select your street" : "No streets listed"}
        searchPlaceholder="Search by street or area…" compactSearchPlaceholder="Street or area…" disabled={disabled || !streets.length} />
    </div>}
    <ResidentSetupMap streets={streets} streetId={streetId} center={center} value={value} method={method} disabled={disabled}
      onAvailability={setMapReady} onPin={point => { if (!disabled) onChange({ method: "MANUAL_PIN", latitude: point[0], longitude: point[1] }, false); }} onStreetPoint={selectPoint} />
    {method === "MANUAL_PIN" && <p className="text-xs text-muted-foreground">Tap the map to place or move your pin.</p>}
    {locating && <p role="status" className="text-xs text-muted-foreground">Finding your location…</p>}
    {message && <p role="alert" className="text-xs text-destructive">{message}</p>}
    {method === "CURRENT_LOCATION" && !locating && <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={locate}>Retry Location</Button>}
    {method === "STREET_POINT" && <div className="space-y-2">
      {!street ? <p className="text-xs text-muted-foreground">Choose your street above.</p>
        : !points.length ? <p role="status" className="text-xs text-muted-foreground">No saved street points are available here. Choose Pin on Map instead.</p>
          : <><p className="text-xs text-muted-foreground">Choose the point nearest your home.</p>
            <div role="group" aria-label="Saved street points" className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {points.map((_, index) => <Button key={index} type="button" size="sm" disabled={disabled || !mapReady} aria-pressed={value?.method === "STREET_POINT" && value.pointIndex === index} variant={value?.method === "STREET_POINT" && value.pointIndex === index ? "default" : "outline"} onClick={() => selectPoint(index)}>Point {index + 1}</Button>)}
            </div></>}
    </div>}
    {method && value && value.method !== "STREET_POINT" && <div className="space-y-3 border-t border-border/60 pt-3">
      {candidates.length > 0 && <h4 className="text-sm font-semibold text-foreground">Choose your collection street</h4>}
      <p className="text-xs leading-relaxed text-muted-foreground">{!candidates.length ? "No nearby street found. Move the pin or check your barangay and street."
        : ambiguous ? "Several streets are nearby. Select your collection street." : "Select the street used for waste collection."}</p>
      {candidates.length > 0 && <div role="group" aria-label="Collection street options" className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">{candidates.map(({ street: candidate, distance }) => <Button type="button" size="sm" className="h-auto whitespace-normal py-2" key={candidate.id} disabled={disabled} aria-pressed={candidate.id === streetId} variant={candidate.id === streetId ? "default" : "outline"} onClick={() => { onStreetChange(candidate.id); onChange(value, false); }}>{streetLabel(candidate)} · {Math.round(distance)} m</Button>)}</div>}
      {value.method === "CURRENT_LOCATION" && value.accuracyMeters > 50 && <p className="text-xs text-muted-foreground">GPS accuracy is low (about {Math.round(value.accuracyMeters)} m). Check or move your pin.</p>}
    </div>}
    {method && value && matches && <div className="space-y-2 border-t border-border/60 pt-3">
      {street && <p className="text-xs font-medium">{streetLabel(street)}{value.method === "STREET_POINT" ? " · Approximate location" : ""}</p>}
      <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed"><Checkbox id="setup-location-confirm" checked={confirmed && matches} disabled={disabled || !matches} onCheckedChange={checked => onChange(value, checked === true)} /><span>{value.method === "STREET_POINT" ? "Use this nearby street point." : "This is my home location and collection street."}</span></label>
    </div>}
    {method && value?.method === "STREET_POINT" && !matches && <p role="status" className="text-xs text-muted-foreground">This street point has changed. Choose another point.</p>}
  </section>;
}
