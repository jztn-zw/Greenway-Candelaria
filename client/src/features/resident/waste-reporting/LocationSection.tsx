import { useResidentQuery } from "@/lib/residentQuery";
import React from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2 } from "lucide-react";
import { fetchBarangays } from "@/services/barangaysService";

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
  const query = useResidentQuery("barangays", ["locations"], fetchBarangays);
  const barangays = query.data ?? [];
  const loadingBarangays = query.isLoading;

  const handleSelect = (selectedId: string) => {
    const found = barangays.find((b) => b.id === selectedId);
    if (found) onBarangayChange(found.id, found.name);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="gw-heading text-sm text-foreground tracking-tight">
          Incident Location
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Specify the barangay and nearby landmark to pinpoint the issue.
        </p>
      </div>

      {query.isError && <p role="alert" className="text-xs text-destructive">Could not refresh barangays. Please try again.</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5">
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Barangay</label>
          {loadingBarangays ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground h-10 px-3 border border-border/80 rounded-lg bg-muted/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              Loading barangays…
            </div>
          ) : (
            <SearchableSelect
              aria-invalid={showError}
              value={barangayId}
              onValueChange={handleSelect}
              options={barangays.map((barangay) => ({ value: barangay.id, label: barangay.name }))}
              placeholder="Select barangay"
              searchPlaceholder="Search barangays..."
              className={`w-full h-10 rounded-xl text-xs lg:text-sm font-medium transition-all ${
                  showError
                    ? "border-destructive/80 focus:ring-destructive/25"
                    : "border-border/80 hover:border-border focus:ring-primary/20 focus:border-primary"
              }`}
              contentClassName="rounded-xl"
            />
          )}
          {showError && !loadingBarangays && (
            <p className="mt-1.5 text-ui-caption font-medium text-destructive">Please select a barangay.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
            Street or Landmark
            <span className="text-ui-caption text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            value={streetOrLandmark}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="e.g. Near the public market, beside chapel"
            maxLength={200}
            className="h-10 rounded-xl border-border/80 text-xs lg:text-sm hover:border-border focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationSection;

