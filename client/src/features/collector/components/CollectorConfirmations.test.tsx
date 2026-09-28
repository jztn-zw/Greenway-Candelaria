import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CollectorLogoutDialog from "./CollectorLogoutDialog";
import EndRouteModal from "../route-map/components/EndRouteModal";
import SkipReasonModal from "../route-map/components/SkipReasonModal";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const click = async (name: string) => { await act(async () => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!.click()); };

it("cancels or confirms collector logout without triggering it early", async () => {
  const onConfirm = vi.fn(); const onOpenChange = vi.fn();
  await act(async () => root.render(<CollectorLogoutDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />));
  await click("Cancel"); expect(onOpenChange).toHaveBeenCalledWith(false); expect(onConfirm).not.toHaveBeenCalled();
  await click("Log Out"); expect(onConfirm).toHaveBeenCalledOnce();
});

it.each([0, 2])("preserves the end-route warning and confirmation for %i remaining checkpoints", async (remaining) => {
  const onConfirm = vi.fn(); const onCancel = vi.fn();
  await act(async () => root.render(<EndRouteModal open remaining={remaining} onConfirm={onConfirm} onCancel={onCancel} />));
  expect(document.body.textContent).toContain(remaining ? "2 checkpoints remaining" : "All checkpoints are completed");
  await click("Cancel"); expect(onCancel).toHaveBeenCalledOnce(); expect(onConfirm).not.toHaveBeenCalled();
  await click("Conclude route"); expect(onConfirm).toHaveBeenCalledOnce();
});

it("keeps a skip reason draft and submits the selected reason and notes", async () => {
  const onConfirm = vi.fn(); const onCancel = vi.fn();
  await act(async () => root.render(<SkipReasonModal open barangay="Poblacion" onConfirm={onConfirm} onCancel={onCancel} />));
  const submit = () => [...document.querySelectorAll("button")].find(b => b.textContent === "Confirm skip")!;
  expect(submit()).toBeDisabled(); await click("Other"); expect(submit()).toBeDisabled();
  act(() => Simulate.change(document.querySelector("textarea")!, { target: { value: "Road blocked" } } as never));
  await click("Cancel"); expect(onCancel).not.toHaveBeenCalled(); expect(document.body.textContent).toContain("Discard Skip Reason?");
  await click("Keep Editing"); expect(document.querySelector("textarea")).toHaveValue("Road blocked");
  await click("Confirm skip"); expect(onConfirm).toHaveBeenCalledWith("Other", "Road blocked");
});

it("discards a skip reason only after confirmation", async () => {
  const onCancel = vi.fn(); const onConfirm = vi.fn();
  await act(async () => root.render(<SkipReasonModal open barangay="Poblacion" onConfirm={onConfirm} onCancel={onCancel} />));
  await click("Truck Issue"); await click("Cancel"); await click("Discard Changes");
  expect(onCancel).toHaveBeenCalledOnce(); expect(onConfirm).not.toHaveBeenCalled();
});
