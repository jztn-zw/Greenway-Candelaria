import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import postsService from "@/services/postsService";
import ResidentContents from "./ResidentContents";
import ResidentTopBar from "@/app/layouts/resident/ResidentTopbar";
import type { PostItem } from "./types";

vi.mock("@/services/postsService", () => ({ default: {
  getPage: vi.fn(), getAll: vi.fn(), getById: vi.fn(), like: vi.fn(), unlike: vi.fn(),
} }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/features/resident/notifications/useResidentNotifications", () => ({ default: () => ({ notifications: [], unreadCount: 0, markAsRead: vi.fn(), markAllAsRead: vi.fn() }) }));

const featuredPost: PostItem = {
  id: "featured-post", title: "Featured collection guide", body: "Full featured post details.",
  category: "WASTE_TIP", status: "PUBLISHED", is_featured: true,
  view_count: 1, like_count: 0, is_liked: false, created_at: "2026-09-28T00:00:00Z", images: [], tags: [],
};
const regularPost: PostItem = { ...featuredPost, id: "regular-post", title: "Community cleanup", body: "Full cleanup details.", is_featured: false };

const HistoryControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return <>
    <output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>History back</button>
    <button onClick={() => navigate(1)}>History forward</button>
  </>;
};

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
let previousAuth: ReturnType<typeof useAuthStore.getState>;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  notifyManager.setScheduler(queueMicrotask);
  previousAuth = useAuthStore.getState();
  useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT", barangay_id: "b1", street_id: "s1" } as never, token: "session-a" });
  vi.mocked(postsService.getPage).mockResolvedValue({ posts: [regularPost, featuredPost], page: 1, total: 2, totalPages: 1, limit: 6 });
  vi.mocked(postsService.getAll).mockResolvedValue([featuredPost]);
  vi.mocked(postsService.getById).mockImplementation(async (id) => id === featuredPost.id ? featuredPost : regularPost);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 1; });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount()); client.clear(); host.remove();
  useAuthStore.setState(previousAuth);
  notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  vi.restoreAllMocks(); vi.clearAllMocks();
});

const render = async () => {
  await act(async () => root.render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/resident/contents"]}>
        <HistoryControls /><ResidentTopBar /><ResidentContents />
      </MemoryRouter>
    </QueryClientProvider>,
  ));
};
const clickButton = async (label: string) => {
  const button = [...host.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
};
const returnToFeed = async () => {
  const link = host.querySelector<HTMLAnchorElement>('nav[aria-label="Breadcrumb"] a[aria-label="Back to Community Updates"]');
  expect(link).toHaveAttribute("href", "/resident/contents");
  expect([...host.querySelectorAll("button")].some((button) => button.textContent?.includes("Back to Community Updates"))).toBe(false);
  await act(async () => link!.click());
};
const openPost = async (post: PostItem) => {
  const heading = [...host.querySelectorAll("h2, h3")].find((item) => item.textContent?.trim() === post.title);
  expect(heading).toBeDefined();
  await act(async () => (heading as HTMLElement).click());
  expect(host.querySelector("h1")).toHaveTextContent(post.title);
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent(`?post=${post.id}`);
};

it.each([featuredPost, regularPost])("reopens $title after returning to the feed without clearing cached details", async (post) => {
  await render();
  for (let attempt = 0; attempt < 3; attempt++) {
    await openPost(post);
    await returnToFeed();
    expect(host.querySelector("h1")).toHaveTextContent("Community Updates");
    expect(host.querySelector('[data-testid="location"]')).toHaveTextContent(/^\/resident\/contents$/);
  }
  expect(postsService.getById).toHaveBeenCalledTimes(1);
  expect(postsService.getById).toHaveBeenCalledWith(post.id);
});

it("restores the correct details through history navigation and when switching posts", async () => {
  await render();
  await openPost(featuredPost);
  await returnToFeed();
  await clickButton("History back");
  expect(host.querySelector("h1")).toHaveTextContent(featuredPost.title);
  await clickButton("History forward");
  expect(host.querySelector("h1")).toHaveTextContent("Community Updates");
  await openPost(regularPost);
  // The featured post appears among the related updates of the regular post.
  await openPost(featuredPost);
  expect(postsService.getById).toHaveBeenCalledTimes(2);
});

it("restores the feed scroll position after using the breadcrumb from a related post", async () => {
  const originalScrollY = window.scrollY;
  try {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 360 });
    await render();
    await openPost(featuredPost);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });
    await openPost(regularPost);
    await returnToFeed();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 360);
  } finally {
    Object.defineProperty(window, "scrollY", { configurable: true, value: originalScrollY });
  }
});
