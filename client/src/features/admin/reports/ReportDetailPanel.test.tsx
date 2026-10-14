import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportDetailPanel from "./ReportDetailPanel";
import type { WasteReport } from "./types";

let host: HTMLDivElement, root: Root, client: QueryClient;
const report: WasteReport = {
  id: "report-a", referenceNumber: "RPT-A", violationType: "Missed Collection",
  violationTypeRaw: "MISSED_COLLECTION", barangay: "Example", barangayId: "barangay",
  description: "Missed collection", submittedAt: "2026-09-27T00:00:00Z",
  submitterName: "Resident", photos: [], status: "Submitted", statusHistory: [],
  officialResponse: "Original response", internalNotes: [], isDuplicate: false, isFalseReport: false,
};
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  client = new QueryClient();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); host.remove(); });
const render = (value: WasteReport, isLoading = false) => act(async () => root.render(
  <QueryClientProvider client={client}><MemoryRouter><ReportDetailPanel report={value} isLoading={isLoading} onAddNote={vi.fn()} onUpdateStatus={vi.fn()} /></MemoryRouter></QueryClientProvider>,
));
const textarea = (placeholder: string) => host.querySelector<HTMLTextAreaElement>(`textarea[placeholder="${placeholder}"]`)!;
const edit = (input: HTMLTextAreaElement, value: string) => act(() => {
  input.value = value; Simulate.change(input);
});
it("links the report owner directly to their resident profile", async () => {
  await render({ ...report, submitterId: "resident-a" });
  expect(host.querySelector('a')).toHaveAttribute("href", "/admin/residents?residentId=resident-a");
});

it("preserves unsaved response and note when another admin updates the same report", async () => {
  await render(report);
  edit(textarea("Type official notification message to be sent to the resident..."), "My unsaved response");
  edit(textarea("Add internal investigation note..."), "My unsaved note");
  await render({ ...report, status: "Under Review", officialResponse: "Other admin response" });
  expect(textarea("Type official notification message to be sent to the resident...").value).toBe("My unsaved response");
  expect(textarea("Add internal investigation note...").value).toBe("My unsaved note");
  await render({ ...report, id: "report-b", officialResponse: "Different report response" });
  expect(textarea("Type official notification message to be sent to the resident...").value).toBe("Different report response");
  expect(textarea("Add internal investigation note...").value).toBe("");
});

it("updates an untouched response when fresh server data arrives", async () => {
  await render(report);
  await render({ ...report, officialResponse: "New saved response" });
  expect(textarea("Type official notification message to be sent to the resident...").value).toBe("New saved response");
});

it("shows a passive loading state, blocks flag actions, and preserves drafts", async () => {
  await render(report);
  edit(textarea("Type official notification message to be sent to the resident..."), "Draft response");
  edit(textarea("Add internal investigation note..."), "Draft note");

  await render(report, true);
  const loading = host.querySelector('[role="status"]');
  expect(loading?.textContent).toContain("Loading report details");
  expect(loading?.querySelector("button, input, textarea")).toBeNull();
  expect(host.querySelector("textarea")).toBeNull();
  const flagButtons = Array.from(host.querySelectorAll("button")).filter((button) => button.textContent?.startsWith("Flag"));
  expect(flagButtons).toHaveLength(2);
  expect(flagButtons.every((button) => button.disabled)).toBe(true);

  await render(report);
  expect(textarea("Type official notification message to be sent to the resident...").value).toBe("Draft response");
  expect(textarea("Add internal investigation note...").value).toBe("Draft note");
});
