import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { CalendarEvent, EventVisibility } from "@/services/scheduleService";
import { SelectedDayPanel } from "./SelectedDayPanel";

afterEach(cleanup);
const event = (visibility: EventVisibility): CalendarEvent => ({
  id: visibility, title: `${visibility} event`, event_date: "2026-10-28",
  event_type: visibility === "PRIVATE" ? "PRIVATE_EVENT" : "COMMUNITY_EVENT",
  visibility, status: "UPCOMING",
});
const show = (events: CalendarEvent[], showAudience = true) => render(
  <SelectedDayPanel variant="admin" selectedDateStr="2026-10-28" events={events}
    showAudience={showAudience} scheduleColorById={new Map()} />,
);

it.each([
  ["PUBLIC", "Residents Only"], ["PRIVATE", "MENRO Only"], ["SHARED", "MENRO & Residents"],
] as const)("identifies the saved %s audience on an admin event card", (visibility, label) => {
  show([event(visibility)]);
  expect(screen.getByLabelText(`Audience: ${label}`)).toHaveTextContent(label);
  expect(screen.getByText("1 event on this date")).toBeInTheDocument();
});

it("labels mixed admin events individually without calling all of them internal", () => {
  show([event("PUBLIC"), event("PRIVATE"), event("SHARED")]);
  expect(screen.getAllByLabelText(/^Audience:/)).toHaveLength(3);
  expect(screen.getByText("3 events on this date")).toBeInTheDocument();
  expect(screen.queryByText(/internal events/)).not.toBeInTheDocument();
});

it("keeps audience labels opt-in so the shared collector panel stays unchanged", () => {
  render(<SelectedDayPanel variant="admin" selectedDateStr="2026-10-28"
    events={[event("PRIVATE")]} scheduleColorById={new Map()} />);
  expect(screen.queryByLabelText(/^Audience:/)).not.toBeInTheDocument();
  expect(screen.getByText("1 internal event on this date")).toBeInTheDocument();
});

it("uses the current admin action name for an empty calendar day", () => {
  show([]);
  expect(screen.getByText("No events scheduled")).toBeInTheDocument();
  expect(screen.getByText('Click "New Schedule / Event" above to add an event.')).toBeInTheDocument();
});
