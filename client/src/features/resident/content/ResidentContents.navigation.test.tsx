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
      <MemoryRouter initialEntries={["/resident/contents"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
  // Featured titles now provide a keyboard-accessible button inside the heading.
  const target = heading!.querySelector<HTMLButtonElement>("button") || heading as HTMLElement;
  await act(async () => target.click());
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

it("shows a page error for a failed feed, hides empty results, and retries the request", async () => {
  vi.mocked(postsService.getPage).mockRejectedValueOnce(new Error("Network Error"));
  await render();
  expect(host.querySelector("h1")).toHaveTextContent("This page couldn't load");
  expect(host.querySelector('input[aria-label="Search community updates"]')).toBeNull();
  expect(host.textContent).not.toContain("Showing 0 articles");
  expect(host.textContent).not.toContain("No updates found");
  await clickButton("Try again");
  expect(host.querySelector("h1")).toHaveTextContent("Community Updates");
  expect(host.textContent).toContain("Community cleanup");
  expect(postsService.getPage).toHaveBeenCalledTimes(2);
});

it("preserves loaded articles after a failed refresh", async () => {
  await render();
  vi.mocked(postsService.getPage).mockRejectedValueOnce(new Error("Network Error"));
  await act(async () => { await client.refetchQueries({ predicate: ({ queryKey }) => queryKey.includes("feed") }); });
  expect(host.querySelector("h1")).toHaveTextContent("Community Updates");
  expect(host.textContent).toContain("Community cleanup");
  expect(host.textContent).toContain("Showing the last loaded articles");
});

it("combines failed feed and featured refreshes into one retry action", async () => {
  await render();
  vi.mocked(postsService.getPage).mockRejectedValueOnce(new Error("offline"));
  vi.mocked(postsService.getAll).mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await client.refetchQueries({ predicate: ({ queryKey }) => queryKey.includes("feed") || queryKey.includes("featured") }); });
  const retries = [...host.querySelectorAll("button")].filter((button) => button.textContent?.trim() === "Try again");
  expect(retries).toHaveLength(1);
  expect(host.textContent).toContain("Community cleanup");
  const feedAttempts = vi.mocked(postsService.getPage).mock.calls.length;
  const featuredAttempts = vi.mocked(postsService.getAll).mock.calls.length;
  await act(async () => retries[0].click());
  expect(postsService.getPage).toHaveBeenCalledTimes(feedAttempts + 1);
  expect(postsService.getAll).toHaveBeenCalledTimes(featuredAttempts + 1);
  expect(host.querySelector('[role="status"]')).toBeNull();
});

it("changes featured slides without opening an article, then opens the selected article from the footer", async () => {
  vi.mocked(postsService.getAll).mockResolvedValue([featuredPost, { ...regularPost, is_featured: true }]);
  await render();
  const next = host.querySelector<HTMLButtonElement>('button[aria-label="Next featured post"]')!;
  await act(async () => next.click());
  expect(host.querySelector("h2")).toHaveTextContent(regularPost.title);
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent(/^\/resident\/contents$/);
  expect(postsService.getById).not.toHaveBeenCalled();

  const previous = host.querySelector<HTMLButtonElement>('button[aria-label="Previous featured post"]')!;
  await act(async () => previous.click());
  expect(host.querySelector("h2")).toHaveTextContent(featuredPost.title);
  await clickButton("Read post");
  expect(host.querySelector("h1")).toHaveTextContent(featuredPost.title);
  expect(postsService.getById).toHaveBeenCalledWith(featuredPost.id);
});

it("keeps the page skeleton until both initial requests finish, then uses only card skeletons for a pending filter", async () => {
  let finishFeed!: (result: { posts: PostItem[]; total: number; totalPages: number; page: number; limit: number }) => void;
  let finishFeatured!: (posts: PostItem[]) => void;
  vi.mocked(postsService.getPage).mockReturnValueOnce(new Promise(resolve => { finishFeed = resolve; }));
  vi.mocked(postsService.getAll).mockReturnValueOnce(new Promise(resolve => { finishFeatured = resolve; }));
  await render();
  expect(host.querySelector('[aria-label="Loading Community Updates"]')).not.toBeNull();
  await act(async () => finishFeed({ posts: [regularPost], total: 1, totalPages: 1, page: 1, limit: 6 }));
  expect(host.querySelector('[aria-label="Loading Community Updates"]')).not.toBeNull();
  expect(host.querySelector('input[aria-label="Search community updates"]')).toBeNull();
  await act(async () => finishFeatured([featuredPost]));
  expect(host.querySelector('[aria-label="Loading Community Updates"]')).toBeNull();
  expect(host.querySelector('input[aria-label="Search community updates"]')).not.toBeNull();

  vi.mocked(postsService.getPage).mockReturnValueOnce(new Promise(resolve => { finishFeed = resolve; }));
  const wasteTips = [...host.querySelectorAll("button")].find(button => button.textContent?.trim() === "Waste Tips")!;
  wasteTips.scrollIntoView = vi.fn();
  await clickButton("Waste Tips");
  expect(host.querySelector('[aria-label="Loading Community Updates"]')).toBeNull();
  expect(host.querySelector('[aria-label="Loading community updates"]')).not.toBeNull();
  expect(host.querySelector('input[aria-label="Search community updates"]')).not.toBeNull();
  await act(async () => finishFeed({ posts: [regularPost], total: 1, totalPages: 1, page: 1, limit: 6 }));
  expect(host.querySelector('[aria-label="Loading community updates"]')).toBeNull();
  expect(host.textContent).toContain(regularPost.title);
});
