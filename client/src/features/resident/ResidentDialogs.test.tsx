import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentSettings from "./settings/ResidentSettings";
import NotificationModal from "./notifications/NotificationModal";
import ResidentAnnouncementModal from "./announcements/ResidentAnnouncementModal";
import ReviewModal from "./waste-reporting/ReviewModal";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import type { ReportFormData } from "./waste-reporting/types";

const mocks = vi.hoisted(() => ({ announcement: { id: "notice-1", title: "Collection update", body: "Collection starts at 7 AM.", type: "GENERAL", created_at: "2026-09-28 00:00:00" }, announcementState: "success" as "success" | "loading" | "error", errorStatus: null as number | null, refetch: vi.fn(), markRead: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/residentQuery", () => ({
  useResidentQuery: (domain: string) => ({ data: domain === "announcements" && mocks.announcementState === "success" ? mocks.announcement : undefined, isLoading: mocks.announcementState === "loading", isFetching: mocks.announcementState === "loading", isError: mocks.announcementState === "error", isSuccess: mocks.announcementState === "success", error: mocks.announcementState === "error" ? (mocks.errorStatus ? { response: { status: mocks.errorStatus } } : new Error("Offline")) : null, refetch: mocks.refetch }),
  useResidentMutation: () => mocks.markRead,
}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); mocks.announcementState = "success"; mocks.errorStatus = null; host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const click = async (name: string) => {
  const scope = name === "Close" ? within(document.querySelector<HTMLElement>(".gw-modal-footer")!) : screen;
  await act(async () => scope.getByRole("button", { name }).click());
};

it.each([
  ["Privacy Policy", "Privacy Policy", "Personal Information Collected"],
  ["Terms of Service", "Terms of Service", "Community Reporting Standards"],
  ["Frequently Asked Questions (FAQ)", "Frequently Asked Questions", "What time does the collection truck arrive?"],
  ["Contact MENRO Candelaria", "Contact MENRO Office", "Office Location"],
])("opens and closes the resident %s dialog while retaining its content", async (action, title, body) => {
  await act(async () => root.render(<ResidentSettings />));
  const open = [...host.querySelectorAll("button")].find(b => b.textContent?.includes(action))!;
  await act(async () => open.click()); expect(document.querySelector('[role="dialog"]')).toHaveTextContent(title);
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent(body); await click("Close dialog");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("preserves notification details and closes through the footer", async () => {
  const onOpenChange = vi.fn();
  await act(async () => root.render(<NotificationModal open onOpenChange={onOpenChange} notification={{ id: "alert-1", type: "system", title: "Notice", message: "Summary", details: "Full details", time: "Now", read: false }} />));
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Full details"); await click("Close"); expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("keeps announcement content and read tracking working", async () => {
  const onOpenChange = vi.fn();
  await act(async () => root.render(<ResidentAnnouncementModal open onOpenChange={onOpenChange} announcementId="notice-1" />));
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Collection starts at 7 AM.");
  expect(mocks.markRead).toHaveBeenCalledWith("notice-1"); await click("Close"); expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("shows announcement loading and failure honestly, then retries without marking unavailable content read", async () => {
  const onOpenChange = vi.fn();
  const render = async () => { await act(async () => root.render(<ResidentAnnouncementModal open onOpenChange={onOpenChange} announcementId="notice-1" />)); };
  mocks.announcementState = "loading"; await render();
  expect(document.querySelector('[role="status"]')).toHaveTextContent("Loading announcement");
  expect(document.body.textContent).not.toContain("No additional details");
  expect(mocks.markRead).not.toHaveBeenCalled();
  mocks.announcementState = "error"; await render();
  expect(document.querySelector('[role="alert"]')).toHaveTextContent("could not be loaded");
  expect(document.body.textContent).not.toContain("No additional details");
  await click("Try again"); expect(mocks.refetch).toHaveBeenCalledOnce();
  expect(mocks.markRead).not.toHaveBeenCalled();
  mocks.announcementState = "success"; await render();
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent(mocks.announcement.body);
  expect(document.querySelector('[role="alert"]')).toBeNull();
  expect(mocks.markRead).toHaveBeenCalledWith("notice-1");
});

it("does not display an unverified announcement preview while details are pending, and marks its notification only once", async () => {
  mocks.announcementState = "loading";
  const onMarkRead = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  await act(async () => root.render(<ResidentAnnouncementModal open onOpenChange={onOpenChange} announcementId="notice-1"
    notification={{ id: "notification-1", user_id: "resident", type: "ANNOUNCEMENT", title: "Old preview", body: "Unverified body", is_read: false, ref_module: "announcements", ref_id: "notice-1", created_at: "2026-09-28 00:00:00" }} onMarkRead={onMarkRead} />));
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Loading announcement");
  expect(document.querySelector('[role="dialog"]')).not.toHaveTextContent("Unverified body");
  expect(onMarkRead).toHaveBeenCalledExactlyOnceWith("notification-1");
  await click("Close");
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onMarkRead).toHaveBeenCalledOnce();
});

it.each([403, 404])("closes an unavailable announcement (%s) and refreshes notification history", async (status) => {
  mocks.announcementState = "error";
  mocks.errorStatus = status;
  const onOpenChange = vi.fn();
  const onUnavailable = vi.fn();
  await act(async () => root.render(<ResidentAnnouncementModal open onOpenChange={onOpenChange} announcementId="notice-1" onUnavailable={onUnavailable} />));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onUnavailable).toHaveBeenCalledOnce();
  expect(mocks.markRead).not.toHaveBeenCalled();
});

it("keeps the admin announcement preview available without fetching or read tracking", async () => {
  mocks.announcementState = "loading";
  await act(async () => root.render(<ResidentAnnouncementModal open onOpenChange={() => {}} announcementId="notice-1" initialAnnouncement={mocks.announcement} disableReadTracking headerTitle="Resident Notice Preview" />));
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Resident Notice Preview");
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent(mocks.announcement.body);
  expect(document.querySelector('[role="status"]')).toBeNull();
  expect(mocks.markRead).not.toHaveBeenCalled();
});

const report: ReportFormData = { violationType: null, barangayId: "poblacion", barangayName: "Poblacion", streetOrLandmark: "Near chapel", pinLocation: null, description: "Waste blocking road", photos: [] };
it("returns to editing a report or submits it only through the selected action", async () => {
  const onOpenChange = vi.fn(); const onSubmit = vi.fn();
  await act(async () => root.render(<ReviewModal open onOpenChange={onOpenChange} onSubmit={onSubmit} form={report} />));
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Waste blocking road");
  await click("Back"); expect(onOpenChange).toHaveBeenCalledWith(false); expect(onSubmit).not.toHaveBeenCalled();
  await click("Submit report"); expect(onSubmit).toHaveBeenCalledOnce();
});
it("prevents report review dismissal or duplicate submission while uploading", async () => {
  const onOpenChange = vi.fn(); const onSubmit = vi.fn();
  await act(async () => root.render(<ReviewModal open onOpenChange={onOpenChange} onSubmit={onSubmit} form={report} isSubmitting submissionStage="uploading" uploadProgress={50} />));
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(onOpenChange).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Uploading photos…" })).toBeDisabled();
  expect(document.querySelector('[role="dialog"]')).not.toHaveTextContent("50%");
  expect([...document.querySelectorAll('[role="dialog"] button')].every(b => (b as HTMLButtonElement).disabled || b.textContent === "Close")).toBe(true);
  expect(onSubmit).not.toHaveBeenCalled();
});
it("uses the resident sidebar logout confirmation without triggering logout on Cancel", async () => {
  const onOpenChange = vi.fn(); const onConfirm = vi.fn();
  await act(async () => root.render(<LogoutConfirmModal open onOpenChange={onOpenChange} onConfirm={onConfirm} />));
  await click("Cancel"); expect(onConfirm).not.toHaveBeenCalled(); expect(onOpenChange).toHaveBeenCalledWith(false);
  await click("Log Out"); expect(onConfirm).toHaveBeenCalledOnce();
});
