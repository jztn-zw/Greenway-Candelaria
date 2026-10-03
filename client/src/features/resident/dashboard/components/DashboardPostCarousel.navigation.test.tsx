import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DashboardPostCarousel from "./DashboardPostCarousel";

const { navigate, posts } = vi.hoisted(() => ({
  navigate: vi.fn(),
  posts: [
    { id: "cleanup", title: "Community cleanup", body: "Join the local cleanup.", category: "EVENT", images: [] },
    { id: "guide", title: "Sorting waste", body: "Separate recyclable materials.", category: "WASTE_TIP", images: [] },
  ],
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/lib/residentQuery", () => ({
  useResidentQuery: () => ({ data: { posts }, isLoading: false, isError: false }),
}));

beforeEach(() => { vi.useFakeTimers(); navigate.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("changes slides from the footer without opening a post", () => {
  render(<DashboardPostCarousel />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Sorting waste")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  expect(screen.getByText("Community cleanup")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Post 2" }));
  expect(screen.getByText("Sorting waste")).toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
});

it("opens the current post when its content is clicked", () => {
  render(<DashboardPostCarousel />);
  fireEvent.click(screen.getByText("Community cleanup"));
  expect(navigate).toHaveBeenCalledExactlyOnceWith("/resident/contents?post=cleanup");
});
