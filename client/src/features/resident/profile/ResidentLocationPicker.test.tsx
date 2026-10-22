import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BarangayStreetRow } from "@/services/barangaysService";
import ResidentLocationPicker from "./ResidentLocationPicker";
import type { ResidentSetupLocation } from "./residentLocation";

vi.mock("./ResidentSetupMap", () => ({ default: function MockLocationMap({ onPin, onAvailability }: { onPin: (point: [number, number]) => void; onAvailability: (value: boolean) => void }) {
  useEffect(() => onAvailability(true), [onAvailability]);
  return <div aria-label="Resident location map"><button type="button" onClick={() => onPin([13.9301, 121.425])}>Tap Home</button><button type="button" onClick={() => onPin([14.5, 121.425])}>Tap Distant Point</button><button type="button" onClick={() => onAvailability(false)}>Fail Map</button></div>;
} }));
const points: [number, number][] = [[13.93, 121.42], [13.93, 121.423], [13.93, 121.427], [13.93, 121.43]];
const streets: BarangayStreetRow[] = [{ id: "ilaya", name: "Argao", area: "Ilaya", coverage_path: Array.from({ length: 40 }, (_, i) => [13.93, 121.42 + i / 3900] as [number, number]), location_points: points }];
const getPosition = vi.fn<Geolocation["getCurrentPosition"]>();
const change = vi.fn();
const geolocationDescriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
function Harness({ rows = streets }: { rows?: BarangayStreetRow[] }) {
  const [value, setValue] = useState<ResidentSetupLocation | null>(null);
  const [confirmed, setConfirmed] = useState(true);
  const [streetId, setStreetId] = useState("ilaya");
  return <><ResidentLocationPicker barangay={{ id: "b", name: "Poblacion", latitude: 13.93, longitude: 121.42 }} streets={rows} streetId={streetId} disabled={false}
    value={value} confirmed={confirmed} onChange={(next, ready) => { change(next, ready); setValue(next); setConfirmed(ready); }} onStreetChange={setStreetId} />
    <output data-testid="draft">{JSON.stringify({ value, confirmed, streetId })}</output>
    <button onClick={() => setStreetId("other")}>Change Street</button></>;
}
const draft = () => JSON.parse(screen.getByTestId("draft").textContent!);
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: getPosition } });
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();
  if (geolocationDescriptor) Object.defineProperty(navigator, "geolocation", geolocationDescriptor);
  else Reflect.deleteProperty(navigator, "geolocation");
});
it("requests no GPS automatically and requires confirmation of a manually placed home point", () => {
  render(<Harness />); expect(getPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Pin on Map" })); fireEvent.click(screen.getByText("Tap Home"));
  expect(draft().value.method).toBe("MANUAL_PIN"); expect(draft().confirmed).toBe(false);
  expect(screen.getByRole("group", { name: "Collection street options" })).toHaveTextContent("Argao (Ilaya)");
  fireEvent.click(screen.getByRole("checkbox")); expect(draft().confirmed).toBe(true);
  expect(draft().value.latitude).toBe(13.9301);
});
it.each(['Pin on Map', 'Use Current Location'])("clears the previous Street Point selection when switching to %s", name => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose a Nearby Street Point' }));
  fireEvent.click(screen.getByRole('button', { name: 'Point 1' }));
  fireEvent.click(screen.getByRole('checkbox'));
  expect(draft().confirmed).toBe(true);
  fireEvent.click(screen.getByRole('button', { name }));
  expect(draft()).toMatchObject({ streetId: '', value: null, confirmed: false });
  expect(screen.queryByRole('checkbox')).toBeNull();
  if (name === 'Use Current Location') {
    act(() => getPosition.mock.calls[0][0]({ coords: { latitude: 13.9301, longitude: 121.425, accuracy: 10 }, timestamp: Date.now() } as GeolocationPosition));
    expect(draft().value.method).toBe('CURRENT_LOCATION');
    expect(draft().streetId).toBe('ilaya');
  }
});
it("shows four saved controls instead of every road geometry vertex", () => {
  render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Choose a Nearby Street Point" }));
  expect(screen.getByRole("group", { name: "Saved street points" }).querySelectorAll("button")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Point 3" }));
  expect(draft().value).toEqual({ method: "STREET_POINT", latitude: points[2][0], longitude: points[2][1], pointIndex: 2 });
  expect(screen.getByText(/Approximate location/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox")); expect(draft().confirmed).toBe(true);
});
it("does not invent saved pins for a legacy street", () => {
  render(<Harness rows={[{ ...streets[0], location_points: null }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose a Nearby Street Point" }));
  expect(screen.getByText(/No saved street points/)).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Saved street points" })).toBeNull();
});
it("handles denied permission without allowing a pinless fallback", () => {
  getPosition.mockImplementationOnce((_success, failure) => failure!({ code: 1 } as GeolocationPositionError));
  render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Use Current Location" }));
  expect(screen.getByText(/permission was denied/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Continue Without a Pin" })).toBeNull();
  expect(draft()).toMatchObject({ value: null, confirmed: false });
});
it("keeps GPS accuracy and capture time and ignores a late callback after switching methods", () => {
  render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Use Current Location" }));
  const position = { coords: { latitude: 13.9301, longitude: 121.425, accuracy: 20 }, timestamp: Date.now() } as GeolocationPosition;
  act(() => getPosition.mock.calls[0][0](position));
  expect(draft().value.accuracyMeters).toBe(20); expect(draft().confirmed).toBe(false);
  expect(draft().streetId).toBe("ilaya");
  fireEvent.click(screen.getByRole("button", { name: "Retry Location" }));
  const late = getPosition.mock.calls[1][0];
  fireEvent.click(screen.getByRole("button", { name: "Pin on Map" })); fireEvent.click(screen.getByText("Tap Home"));
  act(() => late(position)); expect(draft().value.method).toBe("MANUAL_PIN");
});
it("bounds GPS waiting even if the browser never returns a callback", () => {
  vi.useFakeTimers(); render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Use Current Location" }));
  expect(draft().confirmed).toBe(false);
  act(() => vi.advanceTimersByTime(13000));
  expect(screen.getByText(/Location took too long/)).toBeInTheDocument();
  expect(draft()).toMatchObject({ value: null, confirmed: false });
});
it("rejects distant pins and permits choosing among ambiguous Ilaya/Ibaba sections", () => {
  render(<Harness rows={[streets[0], { ...streets[0], id: "ibaba", area: "Ibaba" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Pin on Map" })); fireEvent.click(screen.getByText("Tap Distant Point"));
  expect(screen.queryByRole("checkbox")).toBeNull(); expect(screen.getByText(/No nearby street found/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Tap Home"));
  expect(screen.getByText(/Several streets are nearby/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Argao \(Ibaba\)/ }));
  expect(draft().streetId).toBe("ibaba"); expect(draft().confirmed).toBe(false);
});
it("revokes confirmation when saved controls change and disables point picking after map failure", () => {
  const view = render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Choose a Nearby Street Point" }));
  fireEvent.click(screen.getByRole("button", { name: "Point 1" })); fireEvent.click(screen.getByRole("checkbox"));
  view.rerender(<Harness rows={[{ ...streets[0], location_points: [points[1], points[2]] }]} />);
  expect(draft().confirmed).toBe(false); expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(screen.getByText("Fail Map")); expect(screen.getByRole("button", { name: "Point 1" })).toBeDisabled();
});
it("ignores a GPS result when the selected street changes", () => {
  render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Use Current Location" }));
  const late = getPosition.mock.calls[0][0]; fireEvent.click(screen.getByText("Change Street"));
  act(() => late({ coords: { latitude: 13.93, longitude: 121.42, accuracy: 10 }, timestamp: Date.now() } as GeolocationPosition));
  expect(draft().value).toBeNull(); expect(draft().confirmed).toBe(false);
});

it.each([
  { accuracy: 213, latitude: 13.9301, message: /not accurate enough/ },
  { accuracy: 10, latitude: 14.5, message: /could not be matched/ },
])("does not display an unusable GPS point ($accuracy m)", ({ accuracy, latitude, message }) => {
  render(<Harness />); fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }));
  act(() => getPosition.mock.calls[0][0]({ coords: { latitude, longitude: 121.425, accuracy }, timestamp: Date.now() } as GeolocationPosition));
  expect(draft()).toMatchObject({ value: null, confirmed: false });
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(screen.getByRole('alert')).toHaveTextContent('Pin on Map or Street Point');
  expect(screen.queryByRole('checkbox')).toBeNull();
});
