import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { BARANGAYS } from "./types";
import { useState, useEffect } from "react";

interface LocationSectionProps {
  barangay: string;
  streetOrLandmark: string;
  pinLocation: [number, number] | null;
  onBarangayChange: (value: string) => void;
  onStreetChange: (value: string) => void;
  onPinLocationChange: (coords: [number, number] | null) => void;
}

// Simulate auto-fill from user profile
const USER_PROFILE_BARANGAY = "Candelaria Proper";

const LocationSection = ({
  barangay,
  streetOrLandmark,
  onBarangayChange,
  onStreetChange,
  onPinLocationChange,
  pinLocation,
}: LocationSectionProps) => {
  const [showMap, setShowMap] = useState(false);

  // Auto-fill barangay from profile on mount
  useEffect(() => {
    if (!barangay && USER_PROFILE_BARANGAY) {
      onBarangayChange(USER_PROFILE_BARANGAY);
    }
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Location</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Barangay</label>
          <Select value={barangay} onValueChange={onBarangayChange}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Select barangay" />
            </SelectTrigger>
            <SelectContent>
              {BARANGAYS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {barangay === USER_PROFILE_BARANGAY && (
            <p className="text-[10px] text-primary mt-1 font-medium">Auto-filled from your profile</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Street or Landmark <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <Input
            value={streetOrLandmark}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="e.g. Near the public market"
            maxLength={200}
            className="rounded-xl"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
        >
          <MapPin className="w-3.5 h-3.5" />
          {showMap ? "Hide map" : "Drop a pin on the map instead"}
        </button>

        {showMap && (
          <div className="rounded-2xl border border-border overflow-hidden bg-muted/30">
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-primary/40" />
                <p className="text-xs">Click on the map to drop a pin</p>
                {pinLocation && (
                  <p className="text-xs text-primary font-medium">
                    📍 Pin dropped: {pinLocation[0].toFixed(4)}, {pinLocation[1].toFixed(4)}
                  </p>
                )}
              </div>
            </div>
            {!pinLocation && (
              <div
                className="h-48 absolute inset-0 cursor-crosshair"
                onClick={() => onPinLocationChange([13.9315, 121.4235])}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSection;
