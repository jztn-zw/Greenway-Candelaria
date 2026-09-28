import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminRealtime } from "./adminRealtime";
import { adminKey } from "./adminQuery";

describe("admin live refresh coordination", () => {
  let client: QueryClient;
  let sync: ReturnType<typeof createAdminRealtime>;
  let visible: boolean;
  const cleanups: Array<() => void> = [];
  beforeEach(() => {
    vi.useFakeTimers();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    visible = true;
    sync = createAdminRealtime(client, "admin-a", () => visible);
  });
  afterEach(() => {
    sync.dispose();
    cleanups.splice(0).forEach((cleanup) => cleanup());
    client.clear();
    vi.useRealTimers();
  });
  const observe = (domain: string, read: () => Promise<number>, parts: unknown[] = ["list"]) => {
    const key = adminKey("admin-a", domain, ...parts);
    client.setQueryData(key, 28);
    const observer = new QueryObserver(client, { queryKey: key, queryFn: read, staleTime: Infinity });
    cleanups.push(observer.subscribe(() => {}));
    return { key, observer };
  };

  it("changes 28 to 29 after a report event, batches bursts, and preserves filters and account boundaries", async () => {
    const read = vi.fn().mockResolvedValue(29);
    const { key } = observe("reports", read, ["list", { status: "SUBMITTED", page: 2 }]);
    const other = adminKey("admin-b", "reports", "list");
    const inactive = adminKey("admin-a", "reports", "list", { status: "RESOLVED" });
    client.setQueryData(other, 7); client.setQueryData(inactive, 3);
    sync.changed(["reports"]); sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(300);
    expect(read).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(key)).toBe(29);
    expect(key.at(-1)).toEqual({ status: "SUBMITTED", page: 2 });
    expect(client.getQueryState(inactive)?.isInvalidated).toBe(true);
    expect(client.getQueryState(other)?.isInvalidated).toBe(false);
  });

  it("groups summary updates and ignores unknown domains and profile drafts", async () => {
    const read = vi.fn().mockResolvedValue(29);
    observe("dashboard", read);
    const profile = observe("profile", vi.fn().mockResolvedValue(9));
    sync.changed(["dashboard", "profile", "unknown"]);
    await vi.advanceTimersByTimeAsync(1000);
    sync.changed(["dashboard"]);
    expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(profile.key)).toBe(28);
  });

  it("waits while hidden, reconciles on return, and stops all work on disposal", async () => {
    const read = vi.fn().mockResolvedValue(29);
    observe("reports", read);
    visible = false;
    sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(60_300);
    expect(read).not.toHaveBeenCalled();
    visible = true; sync.reconcile();
    await vi.advanceTimersByTimeAsync(300);
    expect(read).toHaveBeenCalledTimes(1);
    sync.dispose(); sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("recovers missed events with periodic reads", async () => {
    const read = vi.fn().mockResolvedValue(29);
    observe("reports", read);
    await vi.advanceTimersByTimeAsync(60_300);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("restarts an initial read that began before the change and ignores its late result", async () => {
    let resolveOld!: (value: number) => void;
    const old = new Promise<number>((resolve) => { resolveOld = resolve; });
    const read = vi.fn().mockReturnValueOnce(old).mockResolvedValue(29);
    const key = adminKey("admin-a", "reports", "list");
    const observer = new QueryObserver(client, { queryKey: key, queryFn: read });
    cleanups.push(observer.subscribe(() => {}));
    sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(300);
    expect(client.getQueryData(key)).toBe(29);
    resolveOld(28);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getQueryData(key)).toBe(29);
  });

  it("defers events during a pending write to preserve optimistic changes", async () => {
    let complete!: () => void;
    const write = client.getMutationCache().build(client, {
      mutationFn: () => new Promise<void>((resolve) => { complete = resolve; }),
      meta: { adminUserId: "admin-a", adminDomains: ["reports"] },
    });
    const read = vi.fn().mockResolvedValue(29);
    observe("reports", read);
    const pending = write.execute(undefined);
    await vi.advanceTimersByTimeAsync(0);
    sync.changed(["reports"]);
    await vi.advanceTimersByTimeAsync(300);
    expect(read).not.toHaveBeenCalled();
    complete(); await pending;
    await vi.advanceTimersByTimeAsync(300);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
