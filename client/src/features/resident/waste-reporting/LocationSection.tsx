import { useResidentQuery } from "@/lib/residentQuery";
import React from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2 } from "lucide-react";
import { fetchBarangays } from "@/services/barangaysService";
import DataRefreshNotice from "@/components/DataRefreshNotice";

interface LocationSectionProps {
  barangayId: string;
  barangayName: string;
  streetOrLandmark: string;
  onBarangayChange: (id: string, name: string) => void;
  onStreetChange: (value: string) => void;
  showError?: boolean;
  showStreetError?: boolean;
}

const LocationSection: React.FC<LocationSectionProps> = ({
  barangayId,
  streetOrLandmark,
  onBarangayChange,
  onStreetChange,
  showError = false,
  showStreetError = false,
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
              disabled={query.isError && query.data === undefined}
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
          {query.isError && (
            <DataRefreshNotice primary role={query.data === undefined ? "alert" : "status"} className="mt-2" message={query.data === undefined ? "Couldn't load barangays. Your report details are still here." : "Couldn't refresh barangays. Showing the last loaded list."} onRetry={() => void query.refetch()} retrying={query.isFetching} />
          )}
          {showError && !loadingBarangays && (
            <p className="mt-1.5 text-ui-caption font-medium text-destructive">Please select a barangay.</p>
          )}
        </div>

        <div>
          <label htmlFor="report-street-or-landmark" className="text-xs font-medium text-foreground mb-1.5 block">
            Street or Landmark
          </label>
          <Input
            id="report-street-or-landmark"
            aria-invalid={showStreetError}
            aria-describedby={showStreetError ? "report-street-or-landmark-error" : undefined}
            required
            value={streetOrLandmark}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="e.g. Near the public market, beside chapel"
            maxLength={200}
            className={`h-10 rounded-xl text-xs lg:text-sm transition-all ${
              showStreetError
                ? "border-destructive/80 focus-visible:ring-destructive/25"
                : "border-border/80 hover:border-border focus-visible:ring-primary/20 focus-visible:border-primary"
            }`}
          />
          {showStreetError && (
            <p id="report-street-or-landmark-error" role="alert" className="mt-1.5 text-ui-caption font-medium text-destructive">
              Please enter a street or nearby landmark.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationSection;

