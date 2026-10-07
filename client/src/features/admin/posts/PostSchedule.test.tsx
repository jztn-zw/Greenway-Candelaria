import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { syncServerClock } from "@/lib/serverClock";
import PostEditor from "./PostEditor";
import type { Post } from "./types";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/adminQuery", () => ({ useAdminMutation: () => mutate }));

beforeEach(() => syncServerClock("2030-10-01T00:00:00Z", performance.now()));
afterEach(cleanup);

const post: Post = {
  id: "scheduled-post", title: "Collection reminder", body: "Prepare your waste before collection.",
  category: "Waste Tip", status: "Scheduled", featured: false, author: "MENRO",
  publishedDate: null, lastEdited: "Oct 1, 2030", views: 0, likes: 0,
  tags: [], images: [], scheduledDate: "2030-10-08T01:05:00.000Z",
};

it.each([
  ["00:00", "2030-10-07T16:00:00.000Z"],
  ["12:00", "2030-10-08T04:00:00.000Z"],
  ["21:07", "2030-10-08T13:07:00.000Z"],
])("saves %s in Philippine time without changing the scheduled calendar day", async (time, expected) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<PostEditor editingPost={post} onBack={vi.fn()} onSave={onSave} isSaving={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish date and time" }));
  const input = screen.getByLabelText("Time");
  expect(input).toHaveAttribute("type", "time");
  expect(input).toHaveValue("09:05");
  fireEvent.change(input, { target: { value: time } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: expected })));
});

it("rejects arbitrary text and restores the saved time when an incomplete entry loses focus", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<PostEditor editingPost={post} onBack={vi.fn()} onSave={onSave} isSaving={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish date and time" }));
  const input = screen.getByLabelText("Time");
  fireEvent.change(input, { target: { value: "asd" } });
  expect(input).not.toHaveValue("asd");
  fireEvent.blur(input);
  expect(input).toHaveValue("09:05");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: post.scheduledDate })));
});

it("keeps the selected time when choosing a different publish date", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<PostEditor editingPost={post} onBack={vi.fn()} onSave={onSave} isSaving={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish date and time" }));
  fireEvent.click(screen.getByRole("gridcell", { name: "9" }));
  expect(screen.getByRole("dialog", { name: "Publish date and time" })).toBeInTheDocument();
  expect(screen.getByLabelText("Time")).toHaveValue("09:05");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: "2030-10-09T01:05:00.000Z" })));
});

it("uses the themed picker to change the period without changing the publish date", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<PostEditor editingPost={post} onBack={vi.fn()} onSave={onSave} isSaving={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Publish date and time" }));
  fireEvent.click(screen.getByRole("button", { name: "Toggle Time Picker" }));
  const picker = screen.getByRole("dialog", { name: "Choose time" });
  fireEvent.click(within(picker).getByRole("button", { name: /^pm$/i }));
  fireEvent.click(within(picker).getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("dialog", { name: "Choose time" })).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Publish date and time" })).toBeInTheDocument();
  expect(screen.getByLabelText("Time")).toHaveValue("21:05");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: "2030-10-08T13:05:00.000Z" })));
});
