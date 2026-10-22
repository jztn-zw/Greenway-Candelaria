import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import type { User } from "@/services/authService";
import { fetchBarangayStreets } from "@/services/barangaysService";
import ResidentSetup from "./ResidentSetup";
const geolocationDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

vi.mock("@/components/ui/searchable-select", () => ({ SearchableSelect: (props: { id: string; value: string; onValueChange: (id: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) =>
  <select id={props.id} value={props.value} disabled={props.disabled} onChange={event => props.onValueChange(event.target.value)}><option value="" />{props.options.map(row => <option key={row.value} value={row.value}>{row.label}</option>)}</select> }));
vi.mock("./ResidentSetupMap", () => ({ default: function MockMap({ onPin, onAvailability }: { onPin: (point: [number, number]) => void; onAvailability: (ready: boolean) => void }) {
  useEffect(() => onAvailability(true), [onAvailability]);
  return <div aria-label="Resident location map"><button type="button" onClick={() => onPin([13.9301, 121.425])}>Place Test Pin</button></div>;
} }));
vi.mock("@/services/barangaysService", () => ({ fetchBarangays: vi.fn(async () => [{ id: 'a', name: 'First Barangay' }, { id: 'b', name: 'Second Barangay' }]), fetchBarangayStreets: vi.fn() }));
let client: QueryClient;
const result = (id: string) => ({ collection_service_available: true, streets: [{ id: `street-${id}`, name: `Street ${id}`, coverage_path: [[13.93, 121.42], [13.93, 121.43]] as [number, number][] }] });
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user: { id: 'resident', role: 'RESIDENT', username: 'resident', profile_completed: false } as User, token: 'fixture' });
  vi.mocked(fetchBarangayStreets).mockImplementation(async id => result(id));
});
afterEach(() => {
  cleanup(); client.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (geolocationDescriptor) Object.defineProperty(navigator, 'geolocation', geolocationDescriptor);
  else Reflect.deleteProperty(navigator, 'geolocation');
});
const open = () => render(<QueryClientProvider client={client}><MemoryRouter><ResidentSetup /></MemoryRouter></QueryClientProvider>);
it("clears street, pin and confirmation when the barangay changes", async () => {
  open(); await screen.findByRole('option', { name: 'First Barangay' });
  fireEvent.change(screen.getByLabelText('Barangay'), { target: { value: 'a' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose a Nearby Street Point' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Choose a Nearby Street Point' }));
  await screen.findByRole('option', { name: 'Street a' });
  fireEvent.change(screen.getByLabelText('Street'), { target: { value: 'street-a' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pin on Map' })); fireEvent.click(screen.getByText('Place Test Pin'));
  fireEvent.click(screen.getByRole('button', { name: /Street a.*m$/ }));
  fireEvent.click(screen.getByRole('checkbox')); expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent.change(screen.getByLabelText('Barangay'), { target: { value: 'b' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose a Nearby Street Point' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Choose a Nearby Street Point' }));
  await screen.findByRole('option', { name: 'Street b' });
  expect(screen.getByLabelText('Street')).toHaveValue('');
  expect(screen.queryByText(/This is my home location/)).toBeNull();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.getByText(/Choose a point near your home in Second Barangay/)).toBeInTheDocument();
});
it("does not adopt an older street response after choosing another barangay", async () => {
  let finish!: (value: ReturnType<typeof result>) => void;
  vi.mocked(fetchBarangayStreets).mockImplementation(id => id === 'a' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(result(id)));
  open(); await screen.findByRole('option', { name: 'First Barangay' });
  fireEvent.change(screen.getByLabelText('Barangay'), { target: { value: 'a' } });
  await waitFor(() => expect(finish).toBeDefined());
  fireEvent.change(screen.getByLabelText('Barangay'), { target: { value: 'b' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose a Nearby Street Point' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Choose a Nearby Street Point' }));
  await screen.findByRole('option', { name: 'Street b' });
  await act(async () => finish(result('a')));
  expect(screen.queryByRole('option', { name: 'Street a' })).toBeNull();
  expect(screen.getByRole('option', { name: 'Street b' })).toBeInTheDocument();
});
it('shows the street selector only inside Street Point mode before the map', async () => {
  vi.stubGlobal('isSecureContext', true);
  const gps = vi.fn(); Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } });
  open(); await screen.findByRole('option', { name: 'First Barangay' });
  fireEvent.change(screen.getByLabelText('Barangay'), { target: { value: 'a' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose a Nearby Street Point' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Choose a Nearby Street Point' }));
  await screen.findByRole('option', { name: 'Street a' });
  fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }));
  expect(screen.queryByLabelText('Street')).toBeNull();
  act(() => gps.mock.calls[0][0]({ coords: { latitude: 13.9301, longitude: 121.425, accuracy: 10 }, timestamp: Date.now() }));
  expect(screen.queryByLabelText('Street')).toBeNull();
  expect(screen.getByRole('checkbox')).toBeEnabled();
  expect(screen.getByRole('region', { name: 'Resident location' })).not.toHaveTextContent('(Optional)');
  fireEvent.click(screen.getByRole('button', { name: 'Pin on Map' }));
  expect(screen.queryByLabelText('Street')).toBeNull();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose a Nearby Street Point' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Choose a Nearby Street Point' }));
  const field = screen.getByLabelText('Street');
  expect(field).toBeInTheDocument();
  expect(field.compareDocumentPosition(screen.getByLabelText('Resident location map')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
