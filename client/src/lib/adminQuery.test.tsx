import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { notifyManager, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import AppProviders from "@/app/providers/AppProviders";
import { adminKey, useAdminAction, useAdminQuery } from "./adminQuery";

vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));

describe("admin server state", () => {
  let host: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useAuthStore.setState({ user: { id: "admin-a", role: "ADMIN" } as never, token: "test-session-a" });
    client = new QueryClient();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    host.remove();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  });

  it("shares a request between consumers and reuses fresh data on remount", async () => {
    const read = vi.fn<() => Promise<string>>().mockResolvedValue("shared list");
    const List = () => <span>{useAdminQuery("reports", ["list"], read).data}</span>;
    const render = (visible: boolean) => act(async () => root.render(
      <QueryClientProvider client={client}>{visible && <><List /><List /></>}</QueryClientProvider>,
    ));
    await render(true);
    expect(read).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe("shared listshared list");
    await render(false);
    await render(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("refreshes related views after a save without invalidating another account", async () => {
    const read = vi.fn<() => Promise<string>>().mockResolvedValue("before");
    const save = vi.fn().mockImplementation(async () => { read.mockResolvedValue("after"); });
    client.setQueryData(adminKey("admin-b", "reports", "list"), "other account");
    client.setQueryData(adminKey("admin-a", "posts", "list"), "unrelated");
    client.setQueryData(adminKey("admin-a", "dashboard"), "summary");
    const View = () => {
      const query = useAdminQuery("reports", ["list"], read);
      const run = useAdminAction("reports", "residents");
      return <button onClick={() => void run(save)}>{query.data}</button>;
    };
    await act(async () => root.render(<QueryClientProvider client={client}><View /></QueryClientProvider>));
    await act(async () => host.querySelector("button")!.click());
    expect(save).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(2);
    expect(host.textContent).toBe("after");
    expect(client.getQueryState(adminKey("admin-a", "dashboard"))?.isInvalidated).toBe(true);
    expect(client.getQueryState(adminKey("admin-b", "reports", "list"))?.isInvalidated).toBe(false);
    expect(client.getQueryState(adminKey("admin-a", "posts", "list"))?.isInvalidated).toBe(false);
  });

  it("does not retry a failed write or invalidate its unchanged reads", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Save failed"));
    client.setQueryData(adminKey("admin-a", "reports"), "existing");
    const View = () => {
      const run = useAdminAction("reports");
      const [error, setError] = useState("");
      return <button onClick={() => void run(save).catch((err: Error) => setError(err.message))}>{error}</button>;
    };
    await act(async () => root.render(<QueryClientProvider client={client}><View /></QueryClientProvider>));
    await act(async () => host.querySelector("button")!.click());
    expect(save).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe("Save failed");
    expect(client.getQueryState(adminKey("admin-a", "reports"))?.isInvalidated).toBe(false);
  });

  it("clears the old cache and local view state when accounts change", async () => {
    const sessions: QueryClient[] = [];
    const View = () => {
      const cache = useQueryClient();
      if (!sessions.includes(cache)) sessions.push(cache);
      const id = useAuthStore((state) => state.user?.id);
      const [local] = useState(id);
      return <span>{local}</span>;
    };
    await act(async () => root.render(<AppProviders><View /></AppProviders>));
    sessions[0].setQueryData(adminKey("admin-a", "residents"), ["private resident"]);
    await act(async () => useAuthStore.setState({ user: { id: "admin-b", role: "ADMIN" } as never, token: "test-session-b" }));
    expect(host.textContent).toBe("admin-b");
    expect(sessions).toHaveLength(2);
    expect(sessions[0].getQueryCache().getAll()).toHaveLength(0);
    expect(sessions[1].getQueryCache().getAll()).toHaveLength(0);
  });
});
