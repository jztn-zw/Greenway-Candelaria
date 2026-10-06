import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import ResidentSidebar from "@/app/layouts/resident/ResidentSidebar";
import useAuthStore from "@/store/authStore";
import postsService from "@/services/postsService";
import api from "@/lib/api";
import ResidentContents from "./ResidentContents";
import type { PostItem } from "./types";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("@/services/postsService", () => ({ default: { getPage: vi.fn(), getAll: vi.fn(), getById: vi.fn(), like: vi.fn(), unlike: vi.fn() } }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const post: PostItem = { id: "scheduled-post", title: "Scheduled waste guide", body: "Published guide.", category: "WASTE_TIP", status: "PUBLISHED", is_featured: false, view_count: 0, like_count: 0, is_liked: false, created_at: "2026-10-06T00:00:00Z", images: [], tags: [] };
let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
let previousAuth: ReturnType<typeof useAuthStore.getState>;
let unreadContentCount: number;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  notifyManager.setScheduler(queueMicrotask);
  previousAuth = useAuthStore.getState();
  useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT", barangay_id: "b1", street_id: "s1" } as never, token: "session-a" });
  unreadContentCount = 0;
  vi.mocked(api.get).mockImplementation(async () => ({ data: { data: { notifications: [], total: 100, history_total: 100, unread_count: unreadContentCount, unread_content_count: unreadContentCount, limit: 30, offset: 0 } } }));
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  vi.mocked(postsService.getPage).mockResolvedValue({ posts: [post], total: 1, totalPages: 1, page: 1, limit: 6 });
  vi.mocked(postsService.getAll).mockResolvedValue([]);
  vi.mocked(postsService.getById).mockResolvedValue(post);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); client.clear(); host.remove(); useAuthStore.setState(previousAuth);
  notifyManager.setScheduler(callback => setTimeout(callback, 0)); vi.restoreAllMocks(); vi.clearAllMocks();
});
const render = async (entry = "/resident/contents") => {
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SidebarProvider><ResidentSidebar /><ResidentContents /></SidebarProvider></MemoryRouter></QueryClientProvider>));
};
it("leaves a scheduled post notification unread when it arrives while browsing Contents", async () => {
  await render();
  unreadContentCount = 1;
  await act(async () => { await client.refetchQueries({ predicate: ({ queryKey }) => queryKey[2] === "notifications" }); });
  expect(host.textContent).toContain(post.title);
  expect(api.put).not.toHaveBeenCalled();
});
it("opening a post marks only notifications for that post even outside the loaded history window", async () => {
  unreadContentCount = 2;
  await render();
  vi.mocked(api.put).mockClear();
  const heading = [...host.querySelectorAll("h2,h3")].find(element => element.textContent === post.title)!;
  await act(async () => (heading as HTMLElement).click());
  expect(host.querySelector("h1")).toHaveTextContent(post.title);
  expect(api.put).toHaveBeenCalledExactlyOnceWith("/notifications/read-all", { category: "content", post_id: "scheduled-post" });
  await act(async () => { await client.refetchQueries({ predicate: ({ queryKey }) => queryKey[2] === "posts" }); });
  unreadContentCount = 3;
  await act(async () => { await client.refetchQueries({ predicate: ({ queryKey }) => queryKey[2] === "notifications" }); });
  expect(api.put).toHaveBeenCalledTimes(1);
});
it("does not acknowledge a post whose details cannot load", async () => {
  unreadContentCount = 1;
  vi.mocked(postsService.getById).mockRejectedValue(new Error("offline"));
  await render("/resident/contents?post=scheduled-post");
  expect(host.textContent).toContain("couldn't load");
  expect(api.put).not.toHaveBeenCalled();
});
