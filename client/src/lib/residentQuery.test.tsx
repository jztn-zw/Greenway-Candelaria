import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { residentKey, useResidentAction, useResidentQuery } from "./residentQuery";

describe("resident server state", () => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT", barangay_id: "b1", street_id: "s1" } as never, token: "session-a" });
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
      const query = useResidentQuery<number>("reports", ["list"], read);
      const [draft, setDraft] = useState(""); edit = setDraft;
      return <span>{query.data}:{draft}</span>;
    };
    await render(<><View /><View /></>);
    expect(read).toHaveBeenCalledTimes(1);
    await act(async () => edit("unfinished description"));
    read.mockResolvedValue(29);
    await act(async () => { await client.invalidateQueries({ queryKey: ["resident", "resident-a", "reports"] }); });
    expect(host.textContent).toContain("29:unfinished description");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("does not reuse old-address placeholder data or issue queries for another role", async () => {
    const read = vi.fn().mockResolvedValue("street one");
    const View = () => <span>{useResidentQuery<string>("schedule", ["list"], read, { keepPreviousData: true }).data ?? "loading"}</span>;
    await render(<View />);
    expect(host.textContent).toBe("street one");
    read.mockImplementation(() => new Promise(() => {}));
    await act(async () => useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT", barangay_id: "b2", street_id: "s2" } as never }));
    expect(host.textContent).toBe("loading");
    expect(client.getQueryData(residentKey("resident-a", "schedule", "b1:s1", "list"))).toBe("street one");
    await act(async () => useAuthStore.setState({ user: { id: "admin-a", role: "ADMIN" } as never }));
    expect(read).toHaveBeenCalledTimes(2);
    expect(host.textContent).toBe("loading");
  });

  it("refreshes only this resident's affected domains after saving and never retries writes", async () => {
    const other = residentKey("resident-b", "reports", "b1:s1", "list");
    client.setQueryData(other, "private other resident");
    const read = vi.fn().mockResolvedValue(28);
    let run!: ReturnType<typeof useResidentAction>;
    const View = () => { run = useResidentAction("reports"); return <span>{useResidentQuery<number>("reports", ["list"], read).data}</span>; };
    await render(<View />);
    await act(async () => { await run(async () => { read.mockResolvedValue(29); }); });
    expect(host.textContent).toBe("29");
    expect(client.getQueryState(other)?.isInvalidated).toBe(false);
    const fail = vi.fn().mockRejectedValue(new Error("write failed"));
    await act(async () => { await expect(run(fail)).rejects.toThrow("write failed"); });
    expect(fail).toHaveBeenCalledTimes(1);
  });

  it("serializes rapid settings writes and refuses queued writes after login changes", async () => {
    let run!: ReturnType<typeof useResidentAction>;
    let finish!: () => void;
    const View = () => { run = useResidentAction("settings"); return null; };
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
