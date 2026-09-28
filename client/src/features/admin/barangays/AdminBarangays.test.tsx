import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBarangays from "./AdminBarangays";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(),
  barangays: [{ id: "poblacion", name: "Poblacion", status: "ACTIVE", collection_service_available: true, street_count: 1, streets_with_path: 0, active_route_count: 0, live_run_count: 0, latitude: null, longitude: null }],
  streets: [{ id: "street-1", name: "Gonzales St", area: null, active_resident_count: 0, account_link_count: 0, route_plan_count: 0, route_run_record_count: 0 }],
}));
vi.mock("@/lib/adminQuery", () => ({
  useAdminMutation: (action: unknown) => action,
  useAdminResource: (_resource: string, key: string[]) => ({ data: key[0] === "manager" ? mocks.barangays : mocks.streets, setData: vi.fn(), isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock("@/services/barangaysService", () => ({ createBarangayStreet: mocks.create, updateBarangayStreet: mocks.update, deleteBarangayStreet: vi.fn(), updateBarangayCollectionService: vi.fn(), updateBarangayStreetCoverage: vi.fn(), fetchBarangaysManager: vi.fn(), fetchManagedStreets: vi.fn() }));
vi.mock("./StreetCoverageEditor", () => ({ default: () => null }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.create.mockReset().mockResolvedValue(undefined); mocks.update.mockReset().mockResolvedValue(undefined);
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const button = (name: string, scope: ParentNode = document) => [...scope.querySelectorAll("button")].find(b => b.textContent?.trim() === name || b.getAttribute("aria-label") === name)!;
const click = async (name: string, scope: ParentNode = document) => { await act(async () => button(name, scope).click()); };
const change = (id: string, value: string) => act(() => Simulate.change(document.getElementById(id)!, { target: { value } } as never));
async function openCreate() {
  await act(async () => root.render(<AdminBarangays />)); await click("Add street");
  return document.querySelector('[role="dialog"]')!;
}
const submit = async (editor: Element) => { await act(async () => Simulate.submit(editor.querySelector("form")!)); };

describe("street editor unsaved changes", () => {
  it("keeps a draft and clears it only after discard", async () => {
    const editor = await openCreate(); change("barangay-street-name", "New street"); await click("Close", editor);
    expect(document.body.textContent).toContain("Discard New Street?"); await click("Keep Editing");
    expect(document.getElementById("barangay-street-name")).toHaveValue("New street"); await click("Cancel", editor); await click("Discard");
    expect(document.querySelector('[role="dialog"]')).toBeNull(); await click("Add street");
    expect(document.getElementById("barangay-street-name")).toHaveValue(""); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("closes unchanged forms directly and guards edited streets on Escape", async () => {
    const editor = await openCreate(); await click("Cancel", editor); expect(document.querySelector('[role="dialog"]')).toBeNull();
    await click("Edit Gonzales St"); change("barangay-street-area", "Zone A");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.body.textContent).toContain("Discard Street Changes?");
  });
  it("retains failed submissions and closes a successful save directly", async () => {
    const editor = await openCreate(); change("barangay-street-name", "New street");
    mocks.create.mockRejectedValueOnce(new Error("Save failed")); await submit(editor);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Save failed"); expect(document.getElementById("barangay-street-name")).toHaveValue("New street");
    await submit(editor); expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.create).toHaveBeenLastCalledWith("poblacion", { name: "New street", area: null });
  });
});

