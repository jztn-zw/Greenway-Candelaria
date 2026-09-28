import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { collectorKey, useCollectorAction, useCollectorQuery } from "./collectorQuery";

describe("collector server state", () => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useAuthStore.setState({ user: { id: "collector-a", role: "DRIVER", barangay_id: "b1", street_id: "s1" } as never, token: "session-a" });
    client = new QueryClient();
    host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount()); client.clear(); host.remove();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  });
  const render = (node: React.ReactNode) => act(async () => root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>));

  it("deduplicates readers and preserves an unfinished form when server data changes", async () => {
    const read = vi.fn().mockResolvedValue(28);
    let edit!: (value: string) => void;
    const View = () => {
      const query = useCollectorQuery<number>("reports", ["list"], read);
      const [draft, setDraft] = useState(""); edit = setDraft;
      return <span>{query.data}:{draft}</span>;
    };
    await render(<><View /><View /></>);
    expect(read).toHaveBeenCalledTimes(1);
    await act(async () => edit("unfinished description"));
    read.mockResolvedValue(29);
    await act(async () => { await client.invalidateQueries({ queryKey: ["collector", "collector-a", "reports"] }); });
    expect(host.textContent).toContain("29:unfinished description");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not reuse private data after collector or role changes", async () => {
    const read = vi.fn().mockResolvedValue("private collector A");
    const View = () => <span>{useCollectorQuery<string>("schedule", ["list"], read).data ?? "loading"}</span>;
    await render(<View />);
    expect(host.textContent).toBe("private collector A");
    read.mockImplementation(() => new Promise(() => {}));
    await act(async () => useAuthStore.setState({ user: { id: "collector-b", role: "DRIVER" } as never }));
    expect(host.textContent).toBe("loading");
    await act(async () => useAuthStore.setState({ user: { id: "admin-a", role: "ADMIN" } as never }));
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("reuses cached pages on navigation and keeps data visible on a background failure", async () => {
    const read = vi.fn().mockResolvedValue("Saved schedule");
    const View = () => { const query = useCollectorQuery<string>("schedule", ["list"], read); return <span>{query.isLoading ? "skeleton" : query.data}:{query.error ? "failed" : "ready"}</span>; };
    await render(<View />); await render(null); await render(<View />);
    expect(host.textContent).toBe("Saved schedule:ready"); expect(read).toHaveBeenCalledTimes(1);
    read.mockRejectedValue(new Error("offline"));
    await act(async () => { await client.invalidateQueries({ queryKey: collectorKey("collector-a", "schedule") }); });
    expect(host.textContent).toBe("Saved schedule:failed");
  });

  it("refreshes only this collector's affected domains after saving and never retries writes", async () => {
    const other = collectorKey("collector-b", "reports", "b1:s1", "list");
    client.setQueryData(other, "private other collector");
    const read = vi.fn().mockResolvedValue(28);
    let run!: ReturnType<typeof useCollectorAction>;
    const View = () => { run = useCollectorAction("reports"); return <span>{useCollectorQuery<number>("reports", ["list"], read).data}</span>; };
    await render(<View />);
    await act(async () => { await run(async () => { read.mockResolvedValue(29); }); });
    expect(host.textContent).toBe("29");
    expect(client.getQueryState(other)?.isInvalidated).toBe(false);
    const fail = vi.fn().mockRejectedValue(new Error("write failed"));
    await act(async () => { await expect(run(fail)).rejects.toThrow("write failed"); });
    expect(fail).toHaveBeenCalledTimes(1);
  });

  it("serializes rapid settings writes and refuses queued writes after login changes", async () => {
    let run!: ReturnType<typeof useCollectorAction>;
    let finish!: () => void;
    const View = () => { run = useCollectorAction("settings"); return null; };
    await render(<View />);
    const first = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const second = vi.fn().mockResolvedValue(undefined);
    let a!: Promise<unknown>; let b!: Promise<unknown>;
    await act(async () => { a = run(first); b = run(second).catch((error: Error) => error.message); });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    await act(async () => { useAuthStore.setState({ token: "session-b" }); });
    await act(async () => {
      finish(); await a;
      expect(await b).toMatch(/session changed/);
    });
    expect(second).not.toHaveBeenCalled();
  });
});
