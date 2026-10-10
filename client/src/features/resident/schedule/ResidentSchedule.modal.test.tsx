import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ResidentSchedule from "./ResidentSchedule";
import { getManilaNow } from "@/utils/date";
const state = vi.hoisted(() => ({ title: "Community clean-up", description: "Meet at the barangay hall.", removed: false }));

vi.mock("@/lib/residentQuery", () => ({ useResidentQuery: (_domain: string, key: string[]) => ({
  data: key[0] === "calendar" && !state.removed ? [{ id: "event", title: state.title, description: state.description, event_date: getManilaNow().dateKey, event_type: "COMMUNITY_EVENT", visibility: "PUBLIC", status: "UPCOMING" }] : [],
  isLoading: false, isError: false, isSuccess: true,
}) }));
vi.mock("@/store/authStore", () => ({ default: (selector: (state: { user: { barangay_name: string } }) => unknown) => selector({ user: { barangay_name: "Poblacion" } }) }));

it("opens a schedule notice from a focusable button and closes with Escape or the footer", async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div"); document.body.appendChild(host); const root = createRoot(host);
  try {
    await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentSchedule /></MemoryRouter>));
    const event = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Meet at the barangay hall."))!;
    expect(event).toHaveAttribute("type", "button");
    event.focus(); expect(event).toHaveFocus();
    await act(async () => event.click());
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Community clean-up");
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Meet at the barangay hall.");
    state.title = "Updated community event";
    state.description = "Meet at the new venue.";
    await act(async () => root.render(<MemoryRouter><ResidentSchedule /></MemoryRouter>));
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Updated community event");
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Meet at the new venue.");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => event.click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(button => button.textContent === "Close")!.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => event.click());
    state.removed = true;
    await act(async () => root.render(<MemoryRouter><ResidentSchedule /></MemoryRouter>));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    state.removed = false;
    await act(async () => root.render(<MemoryRouter><ResidentSchedule /></MemoryRouter>));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  } finally { act(() => root.unmount()); host.remove(); state.removed = false; }
});
