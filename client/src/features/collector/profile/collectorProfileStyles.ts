import { adminProfileStyles } from "@/features/admin/profile/adminProfileStyles";
import "./collectorProfile.css";

/** Reuse the resident/admin profile geometry for the collector and its skeleton. */
export const collectorProfileStyles = {
  ...adminProfileStyles,
  page: `${adminProfileStyles.page} collector-profile`,
  vehicleHeader: `${adminProfileStyles.sectionHeader} flex-wrap items-start gap-y-3`,
  vehicleHeading: "flex min-w-0 flex-1 basis-48 items-start gap-2.5",
  vehicleGrid: "collector-profile-vehicle-grid grid min-w-0 grid-cols-1 gap-3",
  vehicleCard: "min-w-0 space-y-1 rounded-xl border border-border/60 bg-muted/20 p-3.5",
  vehicleFooter: "collector-profile-vehicle-footer flex min-w-0 flex-col items-start justify-between gap-3 pt-1",
  vehicleAction: "collector-profile-vehicle-action h-9 w-full max-w-full shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold",
  privacy: "mx-auto flex max-w-xl items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-relaxed text-muted-foreground/70",
} as const;
