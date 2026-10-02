import { act, Profiler, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { notifyManager, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import AppProviders from "@/app/providers/AppProviders";
import api from "@/lib/api";
import AdminCollectionCalendar from "@/features/admin/dashboard/components/AdminCollectionCalendar";
import { useAdminDashboard } from "@/features/admin/dashboard/components/useAdminDashboard";
import AdminPosts from "@/features/admin/posts/AdminPosts";
import postsService from "@/services/postsService";
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
    sessionStorage.removeItem("viewingPostId");
    sessionStorage.removeItem("admin_preview_post");
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    host.remove();
    sessionStorage.removeItem("viewingPostId");
    vi.restoreAllMocks();
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

  it("keeps dashboard loading active until its data request resolves", async () => {
    let finish!: (response: Awaited<ReturnType<typeof api.get>>) => void;
    const request = new Promise<Awaited<ReturnType<typeof api.get>>>((resolve) => { finish = resolve; });
    const read = vi.spyOn(api, "get").mockReturnValueOnce(request);
    let state!: ReturnType<typeof useAdminDashboard>;
    const View = () => {
      state = useAdminDashboard();
      return <span>{state.isLoading ? "Loading" : state.overview?.reports.total}</span>;
    };
    await act(async () => root.render(<QueryClientProvider client={client}><View /></QueryClientProvider>));
    expect(read).toHaveBeenCalledWith("/dashboard");
    expect(state.isLoading).toBe(true);
    expect(state.overview).toBeNull();
    expect(host.textContent).toBe("Loading");

    await act(async () => finish({ data: { data: { overview: { reports: { total: 7 } } } } } as never));
    expect(state.isLoading).toBe(false);
    expect(state.isRefreshing).toBe(false);
    expect(host.textContent).toBe("7");
  });

  it("reuses cached dashboard data and keeps it visible during a real refresh", async () => {
    client.setQueryData(adminKey("admin-a", "dashboard"), { overview: { reports: { total: 7 } } });
    let finish!: (response: Awaited<ReturnType<typeof api.get>>) => void;
    const request = new Promise<Awaited<ReturnType<typeof api.get>>>((resolve) => { finish = resolve; });
    const read = vi.spyOn(api, "get").mockReturnValueOnce(request);
    let state!: ReturnType<typeof useAdminDashboard>;
    const View = () => {
      state = useAdminDashboard();
      return <span>{state.isLoading ? "Loading" : state.overview?.reports.total}</span>;
    };
    await act(async () => root.render(<QueryClientProvider client={client}><View /></QueryClientProvider>));
    expect(read).not.toHaveBeenCalled();
    expect(state.isLoading).toBe(false);
    expect(host.textContent).toBe("7");

    await act(async () => { void state.refetch(); });
    expect(read).toHaveBeenCalledTimes(1);
    expect(state.isLoading).toBe(false);
    expect(state.isRefreshing).toBe(true);
    expect(host.textContent).toBe("7");

    await act(async () => finish({ data: { data: { overview: { reports: { total: 9 } } } } } as never));
    expect(state.isRefreshing).toBe(false);
    expect(host.textContent).toBe("9");
  });

  it("shows the calendar skeleton only while its schedule request is pending", async () => {
    let finish!: (response: Awaited<ReturnType<typeof api.get>>) => void;
    const request = new Promise<Awaited<ReturnType<typeof api.get>>>((resolve) => { finish = resolve; });
    const read = vi.spyOn(api, "get").mockReturnValueOnce(request);
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AdminCollectionCalendar asOfDate="2026-09-29" />
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(read).toHaveBeenCalledWith("/schedule/events", { params: undefined });
    expect(host.querySelector('[aria-label="Loading schedule"]')).not.toBeNull();
    expect(host.textContent).not.toContain("MENRO Schedule");

    await act(async () => finish({ data: { data: [] } } as never));
    expect(host.querySelector('[aria-label="Loading schedule"]')).toBeNull();
    expect(host.textContent).toContain("MENRO Schedule");
  });

  it("loads the community list from its request despite a stale stored detail id", async () => {
    sessionStorage.setItem("viewingPostId", "old-post");
    let finish!: (value: Awaited<ReturnType<typeof postsService.getPage>>) => void;
    const request = new Promise<Awaited<ReturnType<typeof postsService.getPage>>>((resolve) => { finish = resolve; });
    vi.spyOn(postsService, "getPage").mockReturnValueOnce(request);
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/admin/posts"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminPosts /></MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(host.textContent).toContain("Loading community posts");
    expect(host.textContent).not.toContain("Loading post details");

    await act(async () => finish({ posts: [], total: 0, totalPages: 1, page: 1, limit: 6 }));
    expect(host.textContent).not.toContain("Loading community posts");
    expect(host.querySelector("h1")?.textContent).toBe("Community Posts");
    expect(host.textContent).toContain("No posts found");
  });

  it("keeps community filters visible while a new filtered list is loading", async () => {
    const read = vi.spyOn(postsService, "getPage").mockResolvedValueOnce({
      posts: [{ id: "post-a", title: "Collection guide", body: "Full article", category: "WASTE_TIP", status: "PUBLISHED", images: [], tags: [] }],
      total: 1, totalPages: 1, page: 1, limit: 6,
    });
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/admin/posts"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminPosts /></MemoryRouter>
      </QueryClientProvider>,
    ));
    let finish!: (value: Awaited<ReturnType<typeof postsService.getPage>>) => void;
    const request = new Promise<Awaited<ReturnType<typeof postsService.getPage>>>((resolve) => { finish = resolve; });
    read.mockReturnValueOnce(request);
    const published = [...host.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Published");
    expect(published).toBeDefined();
    await act(async () => published!.click());
    expect(host.querySelector("h1")?.textContent).toBe("Community Posts");
    expect(host.querySelector('input[placeholder="Search posts by title, tag, or author..."]')).not.toBeNull();
    expect(host.textContent).toContain("Loading community posts");
    expect(host.textContent).not.toContain("Collection guide");

    await act(async () => finish({ posts: [], total: 0, totalPages: 1, page: 1, limit: 6 }));
    expect(host.textContent).not.toContain("Loading community posts");
    expect(host.textContent).toContain("No posts found");
  });

  it("opens and closes the post editor without committing a view for the previous URL", async () => {
    vi.spyOn(postsService, "getPage").mockResolvedValue({
      posts: [], total: 0, totalPages: 1, page: 1, limit: 6,
    });
    const commits: { heading: string | null; search: string | null }[] = [];
    const Location = () => <output data-post-location={useLocation().search} />;
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/admin/posts"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Profiler id="posts" onRender={() => commits.push({
            heading: host.querySelector("h1")?.textContent ?? null,
            search: host.querySelector("output")?.getAttribute("data-post-location") ?? null,
          })}>
            <Location /><AdminPosts />
          </Profiler>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    commits.length = 0;
    const create = [...host.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Create Post")!;
    await act(async () => create.click());
    expect(commits.length).toBeGreaterThan(0);
    expect(commits).toEqual(commits.map(() => ({ heading: "Create Post", search: "?action=create" })));

    commits.length = 0;
    const cancel = [...host.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Cancel")!;
    await act(async () => cancel.click());
    expect(commits.length).toBeGreaterThan(0);
    expect(commits).toEqual(commits.map(() => ({ heading: "Community Posts", search: "" })));
  });

  it("finishes post detail loading independently of the community list", async () => {
    vi.spyOn(postsService, "getPage").mockReturnValueOnce(new Promise(() => {}));
    let finish!: (value: unknown) => void;
    const request = new Promise((resolve) => { finish = resolve; });
    vi.spyOn(postsService, "getById").mockReturnValueOnce(request);
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/admin/posts?post=post-a"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminPosts /></MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(host.textContent).toContain("Loading post details");
    expect(host.textContent).not.toContain("Loading community posts");

    await act(async () => finish({ id: "post-a", title: "Collection guide", body: "Full article", category: "WASTE_TIP", status: "PUBLISHED", images: [], tags: [] }));
    expect(host.textContent).not.toContain("Loading post details");
    expect(host.querySelector("h1")?.textContent).toBe("Collection guide");
    expect(host.textContent).toContain("Full article");
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
