import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createResidentRealtime } from "./adminRealtime";

describe("resident automatic refresh", () => {
  let client: QueryClient;
  let sync: ReturnType<typeof createResidentRealtime>;
  let visible: boolean;
  const cleanups: Array<() => void> = [];
  beforeEach(() => {
    vi.useFakeTimers(); client = new QueryClient(); visible = true;
    sync = createResidentRealtime(client, "resident-a", () => visible);
  });
  afterEach(() => { sync.dispose(); cleanups.splice(0).forEach((fn) => fn()); client.clear(); vi.useRealTimers(); });
  const observe = (role: string, user: string, domain: string) => {
    const key = [role, user, domain, "b1:s1", { status: "SUBMITTED", page: 2 }];
    const read = vi.fn().mockResolvedValue(29);
    client.setQueryData(key, 28);
    const observer = new QueryObserver(client, { queryKey: key, queryFn: read, staleTime: Infinity });
    cleanups.push(observer.subscribe(() => {}));
    return { key, read };
  };
  it("batches changes for the affected resident while retaining filters and other roles' caches", async () => {
    const reports = observe("resident", "resident-a", "reports");
    const other = observe("resident", "resident-b", "reports");
    const admin = observe("admin", "resident-a", "reports");
    const settings = observe("resident", "resident-a", "settings");
    sync.changed(["reports", "unknown"]); sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(300);
    expect(reports.read).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(reports.key)).toBe(29);
    expect(reports.key.at(-1)).toEqual({ status: "SUBMITTED", page: 2 });
    expect(other.read).not.toHaveBeenCalled(); expect(admin.read).not.toHaveBeenCalled(); expect(settings.read).not.toHaveBeenCalled();
  });
  it("checks visible active queries after 60 seconds, pauses hidden checks and cleans up", async () => {
    const reports = observe("resident", "resident-a", "reports");
    const tracking = observe("resident", "resident-a", "tracking");
    await vi.advanceTimersByTimeAsync(60_300);
    expect(reports.read).toHaveBeenCalledTimes(1);
    expect(tracking.read).not.toHaveBeenCalled();
    visible = false; sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(60_300);
    expect(reports.read).toHaveBeenCalledTimes(1);
    visible = true; sync.reconcile(); await vi.advanceTimersByTimeAsync(300);
    expect(reports.read).toHaveBeenCalledTimes(2);
    sync.dispose(); await vi.advanceTimersByTimeAsync(120_000);
    expect(reports.read).toHaveBeenCalledTimes(2);
  });
});
