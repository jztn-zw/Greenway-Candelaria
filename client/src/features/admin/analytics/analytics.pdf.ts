import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFObjectCopier, PDFStream, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDateOnly, formatManilaDateTime } from "@/utils/date";
import type { AnalyticsDashboardData } from "./analytics.types";
import type { AnalyticsSectionId } from "./AnalyticsSectionNav";
import { formatCollectionDistance } from "./analytics.utils";

export interface AnalyticsPdfAssets {
  letterhead: Uint8Array;
  regularFont: Uint8Array;
  boldFont: Uint8Array;
}

export interface AnalyticsPdfOptions {
  barangayLabel: string;
  generatedAt: Date;
  section: AnalyticsSectionId;
}

type Column = { title: string; weight: number; numeric?: boolean };
type Cell = string | number;

const black = rgb(0, 0, 0);
const reportTitles: Record<AnalyticsSectionId, string> = {
  overview: "Analytics Report",
  "collection-performance": "Collection Efficiency Report",
  "missed-collections": "Missed Collections Report",
  "waste-reports": "Reports and Incidents Report",
  "resident-engagement": "Resident Participation Report",
  "truck-driver": "Driver Operations Report",
  "barangay-compliance": "Barangay Coverage Report",
};
// Coordinates measured from the supplied A4 letterhead; never draw into its artwork.
const LEFT = 71;
const RIGHT = 524;
const TOP = 661;
const BOTTOM = 88;
const WIDTH = RIGHT - LEFT;
const SIZE = 8.5;
const LINE = 12;
const PAD = 6;

const cleanText = (value: Cell) => String(value).normalize("NFC")
  // eslint-disable-next-line no-control-regex -- Discard control characters that cannot be laid out as PDF text.
  .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\t/g, " ");

/** Wrap by font metrics, including long unbroken names, without truncating cells. */
const wrap = (value: Cell, font: PDFFont, size: number, width: number) => {
  const lines: string[] = [];
  for (const paragraph of cleanText(value).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ""; }
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line); line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
};

/** Overview includes every section; other tabs report only their own dashboard data. */
export async function createAnalyticsPdf(data: AnalyticsDashboardData, options: AnalyticsPdfOptions, assets: AnalyticsPdfAssets) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const source = await PDFDocument.load(assets.letterhead);
  const [letterhead] = await doc.embedPages([source.getPage(0)]);
  await letterhead.embed();
  // pdf-lib omits the page transparency group when embedding. PDFium needs it
  // to display this letterhead, including its logos, consistently with Poppler.
  const group = source.getPage(0).node.get(PDFName.of("Group"));
  if (group) doc.context.lookup(letterhead.ref, PDFStream).dict.set(PDFName.of("Group"), PDFObjectCopier.for(source.context, doc.context).copy(group));
  const regular = await doc.embedFont(assets.regularFont, { subset: true });
  const bold = await doc.embedFont(assets.boldFont, { subset: true });
  const reportTitle = reportTitles[options.section];
  doc.setTitle(`MENRO ${reportTitle}`);
  doc.setAuthor("Municipal Environment and Natural Resources Office, Candelaria, Quezon");
  doc.setCreator("GreenWay");
  doc.setCreationDate(options.generatedAt);
  doc.setModificationDate(options.generatedAt);
  const dateStyle: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const period = `${formatDateOnly(data.range.from, dateStyle)} - ${formatDateOnly(data.range.to, dateStyle)}`;
  const generated = formatManilaDateTime(options.generatedAt, { ...dateStyle, hour: "numeric", minute: "2-digit" });
  const coverageLines = wrap(`Barangay: ${options.barangayLabel}`, regular, SIZE, WIDTH);
  let page: PDFPage;
  let y = TOP;

  const text = (value: Cell, x: number, baseline: number, font = regular, size = SIZE) => {
    page.drawText(cleanText(value), { x, y: baseline, font, size, color: black });
  };
  const newPage = () => {
    page = doc.addPage([letterhead.width, letterhead.height]);
    page.drawPage(letterhead, { x: 0, y: 0 });
    y = TOP;
    text(reportTitle, LEFT, y, bold, 12);
    y -= 22;
    text(`Reporting Period: ${period}`, LEFT, y);
    y -= 14;
    for (const line of coverageLines) {
      text(line, LEFT, y); y -= LINE;
    }
    y -= 8;
    if (doc.getPageCount() === 1) {
      text(`Date Prepared: ${generated} (Philippine time)`, LEFT, y, regular, 8);
      y -= 23;
    }
  };
  const ensure = (height: number) => { if (y - height < BOTTOM) newPage(); };
  const paragraph = (value: string) => {
    const lines = wrap(value, regular, SIZE, WIDTH);
    ensure(lines.length * LINE + 9);
    for (const line of lines) {
      ensure(LINE); text(line, LEFT, y); y -= LINE;
    }
    y -= 9;
  };
  const heading = (value: string) => {
    ensure(120);
    text(value, LEFT, y, bold, 10); y -= 19;
  };
  const table = (title: string, columns: Column[], rows: Cell[][], note?: string) => {
    const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0);
    const widths = columns.map(column => WIDTH * column.weight / totalWeight);
    const headerSize = 8;
    const headerPad = 4;
    const headers = columns.map((column, index) => wrap(column.title, bold, headerSize, widths[index] - headerPad * 2));
    const headerHeight = Math.max(...headers.map(lines => lines.length)) * LINE + PAD * 2;
    const pageRowCapacity = TOP - 22 - 14 - coverageLines.length * LINE - 8 - 16 - headerHeight - BOTTOM;
    const rowLines = rows.map(row => columns.map((_, index) => wrap(row[index] ?? "", regular, SIZE, widths[index] - PAD * 2)));
    const drawRow = (cells: string[][], height: number, isHeader = false) => {
      page.drawRectangle({ x: LEFT, y: y - height, width: WIDTH, height, borderColor: black, borderWidth: 0.5 });
      let x = LEFT;
      cells.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => {
          const font = isHeader ? bold : regular;
          const size = isHeader ? headerSize : SIZE;
          const padding = isHeader ? headerPad : PAD;
          const offset = columns[index].numeric ? widths[index] - padding - font.widthOfTextAtSize(line, size) : padding;
          text(line, x + offset, y - PAD - SIZE - lineIndex * LINE, font, size);
        });
        x += widths[index];
        if (index < cells.length - 1) page.drawLine({ start: { x, y }, end: { x, y: y - height }, color: black, thickness: 0.5 });
      });
      y -= height;
    };
    const startTable = (continued = false) => {
      const firstRowHeight = rowLines.length ? Math.max(...rowLines[0].map(lines => lines.length)) * LINE + PAD * 2 : LINE + PAD * 2;
      ensure(16 + headerHeight + Math.min(firstRowHeight, pageRowCapacity));
      text(`${title}${continued ? " (continued)" : ""}`, LEFT, y, bold, 9.5);
      y -= 16;
      drawRow(headers, headerHeight, true);
    };
    startTable();
    if (!rows.length) {
      drawRow([["No records for the selected period and barangay."]], 24);
    }
    rowLines.forEach(cells => {
      const lineCount = Math.max(...cells.map(lines => lines.length));
      const rowHeight = lineCount * LINE + PAD * 2;
      // Keep normal rows together. Oversized cells continue with a repeated table header.
      if (y - Math.min(rowHeight, pageRowCapacity) < BOTTOM) { newPage(); startTable(true); }
      let offset = 0;
      while (offset < lineCount) {
        const capacity = Math.floor((y - BOTTOM - PAD * 2) / LINE);
        if (capacity < 1) { newPage(); startTable(true); continue; }
        const count = Math.min(capacity, lineCount - offset);
        drawRow(cells.map(lines => lines.slice(offset, offset + count)), count * LINE + PAD * 2);
        offset += count;
        if (offset < lineCount) { newPage(); startTable(true); }
      }
    });
    y -= 17;
    if (note) paragraph(note);
  };
  const label: Column = { title: "Particulars", weight: 3 };
  const number = (title: string, weight = 1): Column => ({ title, weight, numeric: true });
  const pct = (value: number) => `${value.toLocaleString("en-PH", { maximumFractionDigits: 1 })}%`;
  const o = data.overview;
  const includes = (section: AnalyticsSectionId) => options.section === "overview" || options.section === section;
  let sectionNumber = 0;
  const sectionHeading = (title: string) => heading(`${++sectionNumber}. ${title}`);

  newPage();
  if (includes("overview")) {
    sectionHeading("Operations Summary");
    table("Collection and Report Summary", [label, number("Result")], [
      ["Scheduled collection stops", o.scheduledStops], ["Completed collection stops", o.completedStops],
      ["Collection completion rate", pct(o.completionRate)], ["Missed collection stops", o.missedStops],
      ["Resolved reports submitted in the period", o.resolvedReports], ["Open reports now", o.openReports],
      ["Trucks collecting now", o.activeTrucks], ["Total trucks in coverage", o.totalTrucks],
    ]);
    paragraph("Figures cover the selected reporting period and barangay. Open reports, vehicle status, driver assignments and total registered residents reflect the latest available records.");
  }

  if (includes("collection-performance")) {
    if (options.section === "overview") newPage();
    sectionHeading("Collection Efficiency");
    table("Weekly Collection Results", [{ title: "Week Starting", weight: 1.7 }, number("Scheduled"), number("Completed"), number("Missed"), number("Rate")],
      data.collectionCompletionTrend.map(r => [r.period, r.scheduled, r.completed, r.missed, pct(r.rate)]),
      "The collection rate is the percentage of scheduled stops completed. Cancelled routes are excluded. Ongoing routes may have pending stops.");
    table("Collection Results by Driver", [{ title: "Driver", weight: 2.5 }, number("Scheduled"), number("Completed"), number("Missed"), number("Rate")],
      data.driverOperations.map(r => [r.name, r.scheduledStops, r.completedStops, r.missedStops, pct(r.rate)]));
  }

  if (includes("missed-collections")) {
    sectionHeading("Missed Collections");
    table("Missed Stops by Week", [{ title: "Week Starting", weight: 3 }, number("Missed Stops")], data.missedCollectionsWeekly.map(r => [r.period, r.missed]));
    table("Areas Needing Follow-Up (Top 10)", [{ title: "Barangay", weight: 3 }, number("Scheduled"), number("Missed")], data.missedByArea.map(r => [r.name, r.scheduled, r.missed]));
    table("Recorded Reasons (Top 8)", [{ title: "Reason", weight: 4 }, number("Stops")], data.missedReasons.map(r => [r.reason, r.count]),
      "Missed stops were skipped or remained unfinished when the route ended. The lists show up to 10 barangays and 8 recorded reasons.");
  }

  if (includes("barangay-compliance")) {
    sectionHeading("Barangay Coverage");
    table("Scheduled and Completed Stops", [{ title: "Barangay", weight: 2.5 }, number("Scheduled"), number("Completed"), number("Missed"), number("Rate")],
      data.barangayCoverage.map(r => [r.name, r.scheduled, r.completed, r.missed, pct(r.rate)]));
  }

  if (includes("waste-reports")) {
    sectionHeading("Reports and Incidents");
    table("Report Status", [{ title: "Current Status", weight: 3 }, number("Reports")], data.reportStatusBreakdown.map(r => [r.name, r.value]),
      "Current status of reports submitted within the selected period.");
    table("Reports Submitted by Week", [{ title: "Week Starting", weight: 3 }, number("Reports")], data.reportsPerWeek.map(r => [r.period, r.reports]));
    table("Average Resolution Time", [{ title: "Submission Month", weight: 3 }, number("Days")], data.resolutionTimeMonthly.map(r => [r.month, r.days]),
      "Average number of days from submission to first resolution, grouped by submission month. Zero may mean no resolved reports for that month.");
    table("Report Categories", [{ title: "Category", weight: 3 }, number("Reports")], data.violationTypes.map(r => [r.type, r.count]));
    table("Reports by Barangay (Top 10)", [{ title: "Barangay", weight: 3 }, number("Reports")], data.reportsByBarangay.map(r => [r.name, r.reports]));
  }

  if (includes("resident-engagement")) {
    sectionHeading("Resident Participation");
    table("Participation Summary", [label, number("Result")], [
      ["Total resident accounts now", data.residentSummary.total], ["New residents in the period", data.residentSummary.newResidents],
      ["Distinct residents submitting reports", data.residentSummary.reportingResidents], ["Announcement reads in the period", data.residentSummary.announcementReads],
    ]);
    table("New Registrations by Month", [{ title: "Month", weight: 3 }, number("New Residents")], data.residentRegistrationGrowth.map(r => [r.month, r.registrations]));
    table("Reporting Participation by Month", [{ title: "Month", weight: 2 }, number("Residents Reporting"), number("Reports Submitted")], data.residentParticipation.map(r => [r.month, r.residents, r.reports]));
    paragraph("Total registered residents reflect the latest available records. New registrations, report submissions and announcement reads cover the selected period.");
  }

  if (includes("truck-driver")) {
    sectionHeading("Driver Operations and Vehicle Status");
    table("Distance per Collection Run", [
      { title: "Date", weight: 1.15 }, { title: "Collection Route / Status", weight: 2 },
      { title: "Driver", weight: 1.6 }, { title: "Truck / Plate", weight: 1.8 }, number("GPS Distance", 1.35),
    ], (data.collectionRunDistances ?? []).map(run => [
      formatDateOnly(run.date, dateStyle), `${run.route}\n${run.status === "COMPLETED" ? "Completed" : "Partial"}`,
      run.driver, `${run.truck}\n${run.plate}`,
      `${formatCollectionDistance(run.distanceKm)}${run.distanceKm !== null && run.gapCount + run.rejectedPoints > 0 ? "\nGPS gaps" : ""}`,
    ]), "GPS distance covers the full run, including other barangays. Unrecorded travel is excluded. GPS gaps marks incomplete records. Unavailable means insufficient GPS history.");
    table("Route Outcomes by Driver", [{ title: "Driver", weight: 2.6 }, number("Route Runs"), number("Completed"), number("Incomplete"), number("Missed Routes"), number("Cancelled")],
      data.driverOperations.map(r => [r.name, r.assigned, r.completed, r.incomplete, r.missedRoutes, r.cancelled]));
    table("Driver Stop Completion", [{ title: "Driver / Current Truck", weight: 2.6 }, number("Scheduled"), number("Completed"), number("Missed"), number("Rate")],
      data.driverOperations.map(r => [`${r.name}\n${r.truck}`, r.scheduledStops, r.completedStops, r.missedStops, pct(r.rate)]));
    paragraph("Incomplete routes are partial or overdue with some completed stops. Missed routes are partial or overdue with no completed stops. Cancelled routes are counted separately. Stop completion includes ongoing routes.");
    table("Truck Route Outcomes", [{ title: "Truck / Plate", weight: 2.6 }, number("Route Runs"), number("Completed"), number("Incomplete"), number("Missed Routes"), number("Cancelled")],
      data.fleetStatus.map(r => [`${r.truck}\n${r.plate}`, r.assigned, r.completed, r.incomplete, r.missedRoutes, r.cancelled]));
    table("Current Truck Availability", [{ title: "Truck / Plate", weight: 2.3 }, { title: "Status Now", weight: 2 }, number("Missed Stops")],
      data.fleetStatus.map(r => [`${r.truck}\n${r.plate}`, r.availability, r.missedStops]));
  }

  const pages = doc.getPages();
  pages.forEach((p, index) => {
    page = p;
    text("MENRO, Candelaria, Quezon", LEFT, 69, regular, 7);
    const pageNumber = `Page ${index + 1} of ${pages.length}`;
    text(pageNumber, RIGHT - regular.widthOfTextAtSize(pageNumber, 7), 69, regular, 7);
  });
  return doc.save();
}

export async function downloadAnalyticsPdf(data: AnalyticsDashboardData, options: AnalyticsPdfOptions) {
  const load = async (path: string) => {
    const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
    if (!response.ok) throw new Error("Report template could not be loaded.");
    return new Uint8Array(await response.arrayBuffer());
  };
  const [letterhead, regularFont, boldFont] = await Promise.all([
    load("report-templates/menro-letterhead.pdf"), load("fonts/Vera.ttf"), load("fonts/VeraBd.ttf"),
  ]);
  const bytes = await createAnalyticsPdf(data, options, { letterhead, regularFont, boldFont });
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `MENRO-${reportTitles[options.section].replace(/\s+/g, "-")}-${data.range.from}-to-${data.range.to}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give browsers time to hand the object URL to the download manager.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
