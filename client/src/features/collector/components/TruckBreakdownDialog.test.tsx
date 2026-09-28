import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { expect, it, vi } from "vitest";
import TruckBreakdownDialog from "./TruckBreakdownDialog";

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn() } }));

it("requires a location and sends the selected breakdown details", async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  const send = () => [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Send report")) as HTMLButtonElement;

  try {
    await act(async () => {
      root.render(<TruckBreakdownDialog open onOpenChange={onOpenChange} truckName="Truck 1" truckPlate="ABC-123" onSubmit={onSubmit} />);
    });
    expect(document.body.textContent).toContain("Truck 1");
    expect(document.body.textContent).toContain("ABC-123");

    await act(async () => { send().click(); });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Describe the issue and where the truck is stopped.");
    expect(onSubmit).not.toHaveBeenCalled();

    const details = document.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(details, "Near the chapel, flat tire");
      details.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { (document.querySelector('input[type="checkbox"]') as HTMLInputElement).click(); });
    await act(async () => { send().click(); });

    expect(onSubmit).toHaveBeenCalledWith({
      category: "Flat Tire", description: "Near the chapel, flat tire", urgent: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("protects an unsent breakdown draft and retains it after a failed submission", async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div"); document.body.appendChild(host); const root = createRoot(host);
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Offline")); const onOpenChange = vi.fn();
  const click = async (name: string) => { await act(async () => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!.click()); };
  try {
    await act(async () => root.render(<TruckBreakdownDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />));
    act(() => Simulate.change(document.querySelector("textarea")!, { target: { value: "Flat tire near chapel" } } as never));
    await click("Cancel"); expect(onOpenChange).not.toHaveBeenCalled(); expect(document.body.textContent).toContain("Discard Breakdown Report?");
    await click("Keep Editing"); expect(document.querySelector("textarea")).toHaveValue("Flat tire near chapel");
    await click("Send report"); expect(document.querySelector('[role="alert"]')).toHaveTextContent("The report could not be sent");
    expect(document.querySelector("textarea")).toHaveAttribute("aria-invalid", "false");
    expect(document.querySelector("textarea")).not.toHaveAttribute("aria-errormessage");
    expect(document.querySelector("textarea")).toHaveValue("Flat tire near chapel"); expect(onOpenChange).not.toHaveBeenCalled();
    await click("Cancel"); await click("Discard Report"); expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally { act(() => root.unmount()); host.remove(); }
});

const mountReport = async (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const onOpenChange = vi.fn();
  await act(async () => root.render(<TruckBreakdownDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />));
  const details = document.querySelector("textarea")!;
  return {
    details,
    onSubmit,
    onOpenChange,
    change: (value: string) => act(() => Simulate.change(details, { target: { value } } as never)),
    send: async () => {
      await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === "Send report")!.click());
    },
    cleanup: () => { act(() => root.unmount()); host.remove(); },
  };
};

it("keeps blank input invalid until corrected and focuses the error field", async () => {
  const report = await mountReport();
  try {
    report.change("   ");
    await report.send();
    expect(report.onSubmit).not.toHaveBeenCalled();
    expect(report.details).toHaveFocus();
    expect(report.details).toHaveAttribute("aria-invalid", "true");
    expect(report.details).toHaveClass("border-destructive", "hover:border-destructive", "focus-visible:border-destructive");
    expect(report.details.getAttribute("aria-errormessage")).toBe(document.querySelector('[role="alert"]')!.id);

    report.change(" \n ");
    expect(report.details).toHaveAttribute("aria-invalid", "true");
    report.change("  Flat tire near the chapel  ");
    expect(report.details).toHaveAttribute("aria-invalid", "false");
    expect(document.querySelector('[role="alert"]')).toBeNull();
    await report.send();
    expect(report.onSubmit).toHaveBeenCalledWith({ category: "Flat Tire", description: "Flat tire near the chapel", urgent: false });
  } finally { report.cleanup(); }
});

it("rejects oversized details and accepts the 140-character boundary", async () => {
  const report = await mountReport();
  try {
    expect(report.details).toHaveAttribute("maxlength", "140");
    report.change("x".repeat(141));
    await report.send();
    expect(report.onSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("within 140 characters");
    report.change("x".repeat(140));
    expect(report.details).toHaveAttribute("aria-invalid", "false");
    await report.send();
    expect(report.onSubmit).toHaveBeenCalledWith({ category: "Flat Tire", description: "x".repeat(140), urgent: false });
  } finally { report.cleanup(); }
});

it("locks the submitted fields and allows retrying a failed report", async () => {
  let finish: () => void = () => {};
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockReturnValueOnce(pending);
  const report = await mountReport(onSubmit);
  try {
    report.change("Flat tire near the chapel");
    await report.send();
    expect(report.details).toHaveAttribute("aria-invalid", "false");
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Please try again");
    await report.send();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(report.details).toBeDisabled();
    expect(document.querySelector('[role="combobox"]')).toBeDisabled();
    expect(document.querySelector('input[type="checkbox"]')).toBeDisabled();
    expect(document.querySelector('button[aria-label="Close breakdown report"]')).toBeDisabled();
    const sending = [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Sending"))!;
    expect(sending).toBeDisabled();
    await act(async () => sending.click());
    expect(onSubmit).toHaveBeenCalledTimes(2);
    await act(async () => finish());
    expect(report.onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    await act(async () => finish());
    report.cleanup();
  }
});
