import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";

interface LocationSectionProps {
  barangayId: string;
  barangayName: string;
  streetOrLandmark: string;
  onBarangayChange: (id: string, name: string) => void;
  onStreetChange: (value: string) => void;
  showError?: boolean;
}

const LocationSection: React.FC<LocationSectionProps> = ({
  barangayId,
  streetOrLandmark,
  onBarangayChange,
  onStreetChange,
  showError = false,
}) => {
  const [barangays, setBarangays] = useState<BarangayLocationRow[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(true);

  useEffect(() => {
    fetchBarangays()
      .then((data) => setBarangays(data))
      .catch(() => setBarangays([]))
      .finally(() => setLoadingBarangays(false));
  }, []);

  const handleSelect = (selectedId: string) => {
    const found = barangays.find((b) => b.id === selectedId);
    if (found) onBarangayChange(found.id, found.name);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold font-display text-foreground tracking-tight">
          Incident Location
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Specify the barangay and nearby landmark to pinpoint the issue.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Barangay</label>
          {loadingBarangays ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground h-10 px-3 border border-border/80 rounded-xl bg-muted/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              Loading barangays…
            </div>
          ) : (
            <Select value={barangayId} onValueChange={handleSelect}>
              <SelectTrigger
                className={`w-full h-10 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  showError
                    ? "border-destructive/80 focus:ring-destructive/25"
                    : "border-border/80 hover:border-border focus:ring-primary/20 focus:border-primary"
                }`}
              >
                <SelectValue placeholder="Select barangay" />
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {barangays.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs sm:text-sm rounded-lg py-2 cursor-pointer">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showError && !loadingBarangays && (
            <p className="mt-1.5 text-[11px] font-medium text-destructive">Please select a barangay.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            Street or Landmark
            <span className="text-[11px] text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            value={streetOrLandmark}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="e.g. Near the public market, beside chapel"
            maxLength={200}
            className="h-10 rounded-xl border-border/80 text-xs sm:text-sm hover:border-border focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationSection;
