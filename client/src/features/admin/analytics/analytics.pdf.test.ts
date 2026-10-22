import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFStream, decodePDFRawStream } from "pdf-lib";
import { createAnalyticsPdf } from "./analytics.pdf";
import type { AnalyticsDashboardData } from "./analytics.types";
import { sections, type AnalyticsSectionId } from "./AnalyticsSectionNav";

export const sampleAnalytics: AnalyticsDashboardData = {
  range: { from: "2026-08-28", to: "2026-10-22" },
  overview: { scheduledStops: 280, completedStops: 252, completionRate: 90, missedStops: 18, openReports: 12, resolvedReports: 34, activeTrucks: 1, totalTrucks: 1 },
  collectionRunDistances: [
    { id: "fixture-run-1", date: "2026-10-21", route: "Poblacion Collection Route", driver: "Juan Peña", truck: "Collection Truck 01", plate: "SAMPLE-01", status: "COMPLETED", distanceKm: 12.345678, gapCount: 1, rejectedPoints: 0 },
    { id: "fixture-run-2", date: "2026-10-20", route: "Poblacion Collection Route", driver: "Juan Peña", truck: "Collection Truck 01", plate: "SAMPLE-01", status: "PARTIAL", distanceKm: null, gapCount: 0, rejectedPoints: 0 },
  ],
  collectionCompletionTrend: Array.from({ length: 8 }, (_, i) => ({ period: `Week ${i + 1}`, scheduled: 35, completed: i < 4 ? 31 : 32, missed: i < 2 ? 3 : 2, rate: i < 4 ? 89 : 91 })),
  missedCollectionsWeekly: Array.from({ length: 8 }, (_, i) => ({ period: `Week ${i + 1}`, missed: i < 2 ? 3 : 2 })),
  driverOperations: [{ id: "fixture-driver", name: "Juan Peña", truck: "Collection Truck 01", assigned: 12, completed: 10, incomplete: 1, missedRoutes: 1, cancelled: 0, scheduledStops: 280, completedStops: 252, missedStops: 18, rate: 90 }],
  missedByArea: [{ name: "Poblacion", scheduled: 280, missed: 18 }],
  missedReasons: [{ reason: "Road temporarily blocked by parked vehicles", count: 12 }, { reason: "Collection route ended before remaining stops", count: 6 }],
  reportStatusBreakdown: [{ name: "Submitted", value: 5 }, { name: "Under Review", value: 4 }, { name: "Dispatched", value: 3 }, { name: "Resolved", value: 34 }],
  reportsPerWeek: Array.from({ length: 8 }, (_, i) => ({ period: `Week ${i + 1}`, reports: i < 6 ? 6 : 5 })),
  resolutionTimeMonthly: [{ month: "Aug 2026", days: 1.8 }, { month: "Sep 2026", days: 2.2 }, { month: "Oct 2026", days: 1.5 }],
  violationTypes: [{ type: "Illegal Dumping", count: 26 }, { type: "Uncollected Waste", count: 20 }],
  reportsByBarangay: [{ name: "Poblacion", reports: 46 }],
  residentRegistrationGrowth: [{ month: "Aug 2026", registrations: 4 }, { month: "Sep 2026", registrations: 12 }, { month: "Oct 2026", registrations: 8 }],
  residentParticipation: [{ month: "Aug 2026", residents: 5, reports: 6 }, { month: "Sep 2026", residents: 11, reports: 20 }, { month: "Oct 2026", residents: 9, reports: 20 }],
  residentSummary: { total: 320, newResidents: 24, reportingResidents: 25, announcementReads: 190 },
  fleetStatus: [{ id: "fixture-truck", truck: "Collection Truck 01", plate: "SAMPLE-01", availability: "Collecting", assigned: 12, completed: 10, incomplete: 1, missedRoutes: 1, cancelled: 0, missedStops: 18 }],
  barangayCoverage: [{ name: "Poblacion", scheduled: 280, completed: 252, missed: 18, rate: 90 }],
};

const asset = (name: string) => new Uint8Array(readFileSync(path.resolve("public", name)));
const assets = { letterhead: asset("report-templates/menro-letterhead.pdf"), regularFont: asset("fonts/Vera.ttf"), boldFont: asset("fonts/VeraBd.ttf") };
const options = { barangayLabel: "Poblacion - SAMPLE DATA", generatedAt: new Date("2026-10-22T07:00:00Z"), section: "overview" as const };

async function verifyPages(bytes: Uint8Array, title = "MENRO Analytics Report") {
  const doc = await PDFDocument.load(bytes);
  expect(doc.getTitle()).toBe(title);
  for (const page of doc.getPages()) {
    expect(page.getSize()).toEqual({ width: 595.3, height: 841.9 });
    const xObjects = page.node.Resources()!.lookup(PDFName.of("XObject"), PDFDict);
    const letterhead = doc.context.lookup(xObjects.values()[0], PDFStream);
    const group = letterhead.dict.lookup(PDFName.of("Group"), PDFDict);
    expect(group.get(PDFName.of("S"))?.toString()).toBe("/Transparency");
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => doc.context.lookup(ref)) : [contents];
    const decoded = streams.map(stream => {
      expect(stream).toBeInstanceOf(PDFRawStream);
      return Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode()).toString("latin1");
    }).join("\n");
    // Every page embeds the original letterhead and draws text above its footer.
    expect(decoded).toMatch(/\/EmbeddedPdfPage[^\s]* Do/);
    // Body text is black and table rectangles have no fill. The supplied seals
    // remain inside the original letterhead XObject and retain their colors.
    const fillColors = [...decoded.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map(match => match.slice(1));
    expect(fillColors.length).toBeGreaterThan(0);
    expect(fillColors.every(color => color.every(channel => Number(channel) === 0))).toBe(true);
    expect(decoded).not.toMatch(/\n(?:f\*?|F|B\*?|b\*?)\s*\n/);
    if (/\bre\b/.test(decoded)) expect(decoded).toContain("0.5 w");
    const positions = [...decoded.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/g)];
    expect(positions.length).toBeGreaterThan(5);
    for (const [, x, y] of positions) {
      expect(Number(x)).toBeGreaterThanOrEqual(71);
      expect(Number(x)).toBeLessThan(524);
      expect(Number(y)).toBeGreaterThanOrEqual(69);
      expect(Number(y)).toBeLessThanOrEqual(661);
    }
  }
  return doc;
}

const reportHeadings: Record<AnalyticsSectionId, string> = {
  overview: "Operations Summary", "collection-performance": "Collection Efficiency",
  "missed-collections": "Missed Collections", "waste-reports": "Reports and Incidents",
  "resident-engagement": "Resident Participation", "truck-driver": "Driver Operations and Vehicle Status",
  "barangay-compliance": "Barangay Coverage",
};

// Read only the authored text operators, excluding text inside the letterhead.
function reportText(doc: PDFDocument) {
  return doc.getPages().map(page => {
    const fonts = page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
    const fontMaps = new Map<string, Map<string, string>>();
    for (const [name, ref] of fonts.entries()) {
      const font = doc.context.lookup(ref, PDFDict);
      const unicode = font.lookup(PDFName.of("ToUnicode"), PDFStream) as PDFRawStream;
      const cmap = Buffer.from(decodePDFRawStream(unicode).decode()).toString("latin1");
      const map = new Map<string, string>();
      for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const [, code, value] of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>/gi)) {
          map.set(code.toUpperCase(), String.fromCharCode(...(value.match(/.{4}/g) ?? []).map(part => parseInt(part, 16))));
        }
      }
      fontMaps.set(name.toString(), map);
    }
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => doc.context.lookup(ref)) : [contents];
    return streams.map(stream => {
      const content = Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode()).toString("latin1");
      return [...content.matchAll(/BT([\s\S]*?)ET/g)].map(([, block]) => {
        const font = block.match(/(\/[^\s]+) [\d.]+ Tf/)?.[1];
        const hex = block.match(/<([\da-f]+)> Tj/i)?.[1] ?? "";
        return (hex.match(/.{4}/g) ?? []).map(code => fontMaps.get(font ?? "")?.get(code.toUpperCase()) ?? "").join("");
      }).join("\n");
    }).join("\n");
  }).join("\n");
}

describe("MENRO analytics PDF", () => {
  it("preserves A4 letterhead and safe text margins on every page", async () => {
    const bytes = await createAnalyticsPdf(sampleAnalytics, options, assets);
    const doc = await verifyPages(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    expect(doc.getCreationDate()?.toISOString()).toBe(options.generatedAt.toISOString());
    const text = reportText(doc);
    Object.values(reportHeadings).forEach(heading => expect(text).toContain(heading));
    expect(text).toContain("Distance per Collection Run");
    expect(text).toContain("12.35 km");
    if (process.env.WRITE_ANALYTICS_PDF_SAMPLE === "1") {
      mkdirSync("../output/pdf", { recursive: true });
      writeFileSync("../output/pdf/MENRO-Analytics-Sample.pdf", bytes);
    }
  });

  it.each(sections.filter(section => section.id !== "overview"))("exports only $label in a focused report", async ({ id }) => {
    const bytes = await createAnalyticsPdf(sampleAnalytics, { ...options, section: id }, assets);
    const title = id === "truck-driver" ? "Driver Operations" : reportHeadings[id];
    const doc = await verifyPages(bytes, `MENRO ${title} Report`);
    const text = reportText(doc);
    expect(text).toContain(`1. ${reportHeadings[id]}`);
    for (const [section, heading] of Object.entries(reportHeadings)) {
      if (section !== id) expect(text).not.toContain(`. ${heading}`);
    }
    if (id === "collection-performance") expect(text).toContain("Collection Results by Driver");
    if (id === "truck-driver") {
      expect(text).toContain("Distance per Collection Run");
      expect(text).toContain("12.35 km");
      expect(text).toContain("Unavailable");
      expect(text).toContain("GPS gaps");
    } else expect(text).not.toContain("Distance per Collection Run");
    if (id === "truck-driver" && process.env.WRITE_ANALYTICS_PDF_SAMPLE === "1") {
      mkdirSync("../output/pdf", { recursive: true });
      writeFileSync("../output/pdf/MENRO-Driver-Operations-Sample.pdf", bytes);
    }
  });

  it("paginates many drivers, long reasons and unbroken names without losing the footer", async () => {
    const data = structuredClone(sampleAnalytics);
    data.driverOperations = Array.from({ length: 45 }, (_, i) => ({ ...sampleAnalytics.driverOperations[0], id: `driver-${i}`, name: `Peña Cabuñag ${i} ${"LongUnbrokenName".repeat(5)}` }));
    data.collectionRunDistances = Array.from({ length: 45 }, (_, i) => ({ ...sampleAnalytics.collectionRunDistances[0], id: `run-${i}`, route: `Recorded run ${i}` }));
    data.missedReasons = [{ reason: "Access blocked. ".repeat(500), count: 18 }];
    const bytes = await createAnalyticsPdf(data, options, assets);
    const doc = await verifyPages(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(15);
    const text = reportText(doc);
    data.collectionRunDistances.forEach(run => expect(text).toContain(run.route));
    if (process.env.WRITE_ANALYTICS_PDF_SAMPLE === "1") {
      mkdirSync("../tmp/pdfs", { recursive: true });
      writeFileSync("../tmp/pdfs/MENRO-Analytics-Stress.pdf", bytes);
    }
  });

  it("exports an empty dashboard without inventing rows", async () => {
    const empty = Object.fromEntries(Object.entries(sampleAnalytics).map(([key, value]) => [key, Array.isArray(value) ? [] : value])) as unknown as AnalyticsDashboardData;
    empty.overview = { scheduledStops: 0, completedStops: 0, completionRate: 0, missedStops: 0, openReports: 0, resolvedReports: 0, activeTrucks: 0, totalTrucks: 0 };
    empty.residentSummary = { total: 0, newResidents: 0, reportingResidents: 0, announcementReads: 0 };
    await verifyPages(await createAnalyticsPdf(empty, options, assets));
  });
});
