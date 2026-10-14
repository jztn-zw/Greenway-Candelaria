import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { fetchResidents, fetchResidentById, fetchResidentReports, updateResidentStatus, type ResidentDetailsRow } from "@/services/residentManagerService";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import AdminResidents from "./AdminResidents";

vi.mock("@/services/residentManagerService", () => ({ fetchResidents: vi.fn(), fetchResidentById: vi.fn(), fetchResidentReports: vi.fn(), updateResidentStatus: vi.fn(), deleteResident: vi.fn() }));
vi.mock("@/services/barangaysService", () => ({ fetchBarangaysAdmin: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let root: Root; let host: HTMLDivElement; let client: QueryClient;
let account: ResidentDetailsRow;
beforeEach(() => {
  vi.resetAllMocks();
  notifyManager.setScheduler(queueMicrotask);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useAuthStore.setState({ user: { id: "admin", role: "ADMIN" } as never, token: "test-session" });
  account = { id: "resident", full_name: "Test Resident", username: "test_resident", role: "RESIDENT", status: "ACTIVE", email: "resident@example.com", phone: null, avatar_url: null, barangay_name: "Poblacion", created_at: "2026-10-01 00:00:00", ban_reason: null } as ResidentDetailsRow;
  vi.mocked(fetchResidents).mockImplementation(async (filters = {}) => {
    const rows = !filters.status || filters.status === account.status ? [{ ...account }] : [];
    return { data: rows, pagination: { total: rows.length, total_pages: 1, page: 1, limit: 10 } } as never;
  });
  vi.mocked(fetchResidentById).mockImplementation(async () => ({ ...account }));
  vi.mocked(fetchResidentReports).mockResolvedValue([]);
  vi.mocked(fetchBarangaysAdmin).mockResolvedValue([]);
  vi.mocked(updateResidentStatus).mockImplementation(async (_id, status, reason) => {
    account = { ...account, status, ban_reason: status === "BANNED" ? reason! : null };
    return { ...account };
  });
  client = new QueryClient();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); client.clear(); host.remove();
  notifyManager.setScheduler((callback) => setTimeout(callback, 0));
});
const render = async (detail = true) => {
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/admin/residents${detail ? "?residentId=resident" : ""}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminResidents /></MemoryRouter></QueryClientProvider>));
};
const findButton = (name: string, scope: ParentNode = document) => {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === name || button.getAttribute("aria-label") === name);
  if (!found) throw new Error(`Missing button: ${name}`);
  return found;
};
const click = async (name: string, scope: ParentNode = document) => { await act(async () => findButton(name, scope).click()); };
const dialog = () => document.querySelector('[role="dialog"]')!;
const reason = () => document.getElementById("resident-ban-reason") as HTMLTextAreaElement;
const typeReason = (value: string) => act(() => { Simulate.change(reason(), { target: { value } } as never); });

it("requires a reason and explicit confirmation before banning from the resident profile", async () => {
  await render();
  await click("Ban Resident");
  expect(updateResidentStatus).not.toHaveBeenCalled();
  expect(findButton("Ban Resident", dialog())).toBeDisabled();
  typeReason("   ");
  expect(findButton("Ban Resident", dialog())).toBeDisabled();
  typeReason("  Repeated abusive reports  ");
  await click("Ban Resident", dialog());
  expect(updateResidentStatus).toHaveBeenCalledExactlyOnceWith("resident", "BANNED", "Repeated abusive reports");
  expect(dialog()).toBeNull();
  expect(host.textContent).toContain("Account Banned");
  expect(host.textContent).toContain("Reason: Repeated abusive reports");
  expect(findButton("Unban Resident")).toBeInTheDocument();
});

it("requires confirmation to unban and clears the saved reason", async () => {
  account = { ...account, status: "BANNED", ban_reason: "Abusive reports" };
  await render(); await click("Unban Resident");
  expect(updateResidentStatus).not.toHaveBeenCalled();
  expect(reason()).toBeNull();
  await click("Unban Resident", dialog());
  expect(updateResidentStatus).toHaveBeenCalledExactlyOnceWith("resident", "ACTIVE", undefined);
  expect(host.textContent).toContain("Account Active");
  expect(host.textContent).not.toContain("Reason: Abusive reports");
});

it("leaves deactivated residents read-only and provides no reactivate or ban control", async () => {
  account.status = "DEACTIVATED";
  await render();
  expect(host.textContent).toContain("Account Deactivated");
  expect([...host.querySelectorAll("button")].some((button) => /Ban|Reactivate|Deactivate/.test(button.textContent || ""))).toBe(false);
  expect(updateResidentStatus).not.toHaveBeenCalled();
});

it("opens the same ban confirmation from the directory action menu", async () => {
  await render(false);
  const trigger = findButton("Actions for Test Resident");
  await act(async () => trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 })));
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((element) => element.textContent?.trim() === "Ban Resident");
  expect(item).toBeDefined();
  await act(async () => item!.click());
  expect(dialog()?.textContent).toContain("Ban Resident");
  expect(reason()).toHaveAttribute("maxLength", "255");
  expect(updateResidentStatus).not.toHaveBeenCalled();
});

it("blocks duplicate submissions while saving and preserves the reason after a failure", async () => {
  await render(); await click("Ban Resident"); typeReason("Repeated abuse");
  let fail!: (error: Error) => void;
  vi.mocked(updateResidentStatus).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  await click("Ban Resident", dialog());
  expect(reason()).toBeDisabled();
  expect(findButton("Cancel", dialog())).toBeDisabled();
  expect(updateResidentStatus).toHaveBeenCalledTimes(1);
  await act(async () => fail(new Error("Unable to save the ban")));
  expect(dialog().querySelector('[role="alert"]')).toHaveTextContent("Unable to save the ban");
  expect(reason()).toHaveValue("Repeated abuse");
  expect(host.textContent).toContain("Account Active");
  await click("Ban Resident", dialog());
  expect(updateResidentStatus).toHaveBeenCalledTimes(2);
  expect(dialog()).toBeNull();
});
