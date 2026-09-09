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
}

const LocationSection: React.FC<LocationSectionProps> = ({
  barangayId,
  streetOrLandmark,
  onBarangayChange,
  onStreetChange,
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
    <div className="space-y-3.5">
      <h3 className="text-sm font-semibold text-foreground">Location</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Barangay
          </label>
          {loadingBarangays ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground h-10 px-3 border border-border rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading barangays…
            </div>
          ) : (
            <Select value={barangayId} onValueChange={handleSelect}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Select barangay" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {barangays.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Street or Landmark{" "}
            <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <Input
            value={streetOrLandmark}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="e.g. Near the public market, beside chapel"
            maxLength={200}
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationSection;
