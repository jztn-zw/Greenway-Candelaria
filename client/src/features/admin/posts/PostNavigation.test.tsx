import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PostEditor from "./PostEditor";
import PostListView from "./PostListView";
import type { Post } from "./types";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/adminQuery", () => ({ useAdminMutation: () => mutate }));
afterEach(cleanup);

it("returns from an untouched editor using Back", () => {
  const onBack = vi.fn();
  render(<PostEditor editingPost={null} onBack={onBack} onSave={vi.fn()} isSaving={false} />);
  const back = screen.getByRole("button", { name: /^Back to posts$/i });
  expect(back).toHaveTextContent(/^$/);
  expect(back).toHaveAttribute("title", "Back to Posts");
  expect(back.closest("header")).toContainElement(screen.getByRole("heading", { name: "Create Post", level: 1 }));
  fireEvent.click(back);
  expect(onBack).toHaveBeenCalledOnce();
});

it("protects unsaved content when Back is pressed and returns only after discard", async () => {
  const onBack = vi.fn();
  render(<PostEditor editingPost={null} onBack={onBack} onSave={vi.fn()} isSaving={false} />);
  fireEvent.change(screen.getByPlaceholderText("e.g., Household Waste Segregation Guidelines for 2026"), { target: { value: "Unsaved post" } });
  fireEvent.click(screen.getByRole("button", { name: /^Back to posts$/i }));
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toHaveTextContent("Save as Draft?");
  fireEvent.click(screen.getByRole("button", { name: "Discard Post" }));
  await waitFor(() => expect(onBack).toHaveBeenCalledOnce());
});

it("disables Back while a post is saving", () => {
  const onBack = vi.fn();
  render(<PostEditor editingPost={null} onBack={onBack} onSave={vi.fn()} isSaving />);
  const back = screen.getByRole("button", { name: /^Back to posts$/i });
  expect(back).toBeDisabled();
  fireEvent.click(back);
  expect(onBack).not.toHaveBeenCalled();
});

it("opens the correct post from a keyboard-focusable compact list control", () => {
  const post: Post = {
    id: "post-42", title: "Prepare your recyclables", body: "Clean bottles before collection.",
    category: "Waste Tip", status: "Published", featured: false, author: "MENRO",
    publishedDate: "Oct 3, 2026", lastEdited: "Oct 3, 2026", views: 12, likes: 3,
    tags: [], images: [], scheduledDate: null,
  };
  const onView = vi.fn();
  render(<PostListView posts={[post]} onView={onView} onEdit={vi.fn()} onDuplicate={vi.fn()}
    onArchive={vi.fn()} onTogglePublish={vi.fn()} onDelete={vi.fn()} />);
  const open = screen.getByRole("button", { name: `View post: ${post.title}` });
  open.focus();
  expect(document.activeElement).toBe(open);
  fireEvent.click(open);
  expect(onView).toHaveBeenCalledWith(post);
});
