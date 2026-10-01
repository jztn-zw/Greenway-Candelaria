import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { categoryStyles, statusStyles } from "@/features/admin/posts/types";
import { announcementTypeStyles } from "@/features/admin/announcements/types";
import { statusBadgeStyles, violationBadgeStyles } from "@/features/admin/reports/types";
import { driverStatusStyles, truckStatusStyles } from "@/features/admin/drivers/types";
import { getCategoryBadgeStyle } from "@/features/resident/content/types";
import { REPORT_STATUS_CONFIG } from "@/features/resident/waste-reporting/myReports.utils";
import { badgeVariants } from "./badge";
import { badgeStyles, getCategoryBadgeColors, getStatusBadgeStyle } from "./badgeStyles";

describe("shared badge colors", () => {
  it("matches resident post categories with admin and announcement categories", () => {
    for (const [label, backend] of [["Waste Tip", "WASTE_TIP"], ["Event", "EVENT"]]) {
      const resident = getCategoryBadgeStyle(backend);
      expect(`${resident.bg} ${resident.text} ${resident.border}`).toBe(categoryStyles[label]);
    }
    expect(announcementTypeStyles["Community Event"]).toBe(categoryStyles.Event);
  });

  it("keeps report statuses identical across admin and resident views", () => {
    for (const status of Object.values(REPORT_STATUS_CONFIG)) {
      expect(status.className).toBe(statusBadgeStyles[status.label as keyof typeof statusBadgeStyles].badge + " border");
    }
  });

  it("shares Active and Scheduled colors across different modules", () => {
    expect(driverStatusStyles.Active).toBe(truckStatusStyles.Active);
    expect(getStatusBadgeStyle("SCHEDULED").className).toBe(statusStyles.Scheduled);
    expect(getStatusBadgeStyle("Under maintenance").className).toBe(truckStatusStyles["Under Maintenance"]);
  });

  it("accepts API keys and display labels without losing their semantic color", () => {
    expect(getStatusBadgeStyle(" under-review ")).toBe(getStatusBadgeStyle("UNDER_REVIEW"));
    expect(getCategoryBadgeColors("non-biodegradable")).toBe(getCategoryBadgeColors("NON_BIODEGRADABLE"));
    expect(getCategoryBadgeColors("ILLEGAL_DUMPING").className).toBe(violationBadgeStyles["Illegal Dumping"]);
    expect(getCategoryBadgeColors("Collection Route Schedule")).toBe(getCategoryBadgeColors("COLLECTION_SCHEDULE"));
  });

  it("replaces default badge colors without changing its dimensions", () => {
    const merged = cn(badgeVariants({ variant: "outline" }), getStatusBadgeStyle("Completed").className);
    expect(merged).toContain("px-2 py-0.5");
    expect(merged).toContain(badgeStyles.success.className);
    expect(merged).not.toMatch(/badge-neutral/);
    expect(merged).not.toMatch(/hover:bg/);
  });

  it("uses a neutral fallback for unknown statuses", () => {
    expect(getStatusBadgeStyle("unrecognized status")).toBe(badgeStyles.neutral);
  });
});
