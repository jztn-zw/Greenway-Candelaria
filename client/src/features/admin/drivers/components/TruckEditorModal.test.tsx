import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TruckEditorModal from "./TruckEditorModal";
import type { Truck } from "../types";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const truck: Truck = { id: "truck-1", name: "Truck 1", model: "Isuzu", plateNumber: "ABC-123", assignedDriverId: null, status: "Active", dateAdded: "2026-09-28" };
const button = (name: string) => [...document.querySelectorAll("button")].find(b => b.textContent === name || b.getAttribute("aria-label") === name)!;
const click = async (name: string) => { await act(async () => button(name).click()); };
const change = (id: string, value: string) => act(() => Simulate.change(document.getElementById(id)!, { target: { value } } as never));
async function setup(editingTruck: Truck | null = null, isSaving = false) {
  const onOpenChange = vi.fn(); const onSave = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(<TruckEditorModal open onOpenChange={onOpenChange} editingTruck={editingTruck} drivers={[]} trucks={[]} isSaving={isSaving} onSave={onSave} />));
  return { onOpenChange, onSave };
}

describe("truck editor unsaved changes", () => {
  it("keeps a draft after Cancel and discards only after confirmation", async () => {
    const { onOpenChange, onSave } = await setup();
    change("truck-model", "Isuzu"); await click("Cancel");
    expect(document.body.textContent).toContain("Discard New Truck?"); expect(onOpenChange).not.toHaveBeenCalled();
    await click("Keep Editing"); expect(document.getElementById("truck-model")).toHaveValue("Isuzu");
    await click("Close truck editor"); await click("Discard");
    expect(onOpenChange).toHaveBeenCalledWith(false); expect(onSave).not.toHaveBeenCalled();
  });
  it("closes unchanged records directly and guards edited records on Escape", async () => {
    const { onOpenChange } = await setup(truck); await click("Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await act(async () => root.render(null));
    const edited = await setup(truck); change("truck-name", "Truck 2");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.body.textContent).toContain("Discard Truck Changes?"); expect(edited.onOpenChange).not.toHaveBeenCalled();
  });
  it("retains a failed save then saves successfully without a discard prompt", async () => {
    const { onOpenChange, onSave } = await setup(truck); change("truck-name", "Truck 2");
    onSave.mockRejectedValueOnce(new Error("Save failed")); await click("Save Changes");
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Save failed"); expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.getElementById("truck-name")).toHaveValue("Truck 2"); await click("Save Changes");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).toHaveBeenLastCalledWith({ name: "Truck 2", model: "Isuzu", plateNumber: "ABC-123", status: "Active" });
    expect(document.body.textContent).not.toContain("Discard Truck Changes?");
  });
  it("blocks dismissal while saving", async () => {
    const { onOpenChange } = await setup(truck, true);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onOpenChange).not.toHaveBeenCalled(); expect(button("Cancel")).toBeDisabled(); expect(button("Close truck editor")).toBeDisabled();
  });
});
