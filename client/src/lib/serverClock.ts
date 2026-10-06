import { parseApiTimestamp } from "@/utils/apiTimestamp";

let sample: { time: number; receivedAt: number; requestedAt: number } | null = null;
const listeners = new Set<() => void>();

// Advance the trusted UTC sample with a monotonic timer, never the device clock.
export const getServerNow = (): number | null => sample
  ? sample.time + Math.max(0, performance.now() - sample.receivedAt)
  : null;

export const getSystemNow = (): number => {
  const now = getServerNow();
  if (now === null) throw new Error("System time is not synchronized.");
  return now;
};
export const getSystemDate = () => new Date(getSystemNow());

export const syncServerClock = (value: string | undefined, requestedAt: number) => {
  const timestamp = parseApiTimestamp(value)?.getTime();
  if (timestamp === undefined || (sample && requestedAt < sample.requestedAt)) return;
  const receivedAt = performance.now();
  sample = { time: timestamp + Math.max(0, receivedAt - requestedAt) / 2, receivedAt, requestedAt };
  listeners.forEach(listener => listener());
};

export const subscribeToServerClock = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
