import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PostEditor from "./PostEditor";
import type { Post } from "./types";
import PostBodyInput from "@/components/common/PostBodyEditor";

vi.mock("@/lib/adminQuery", () => ({ useAdminMutation: () => vi.fn() }));
afterEach(cleanup);

it("pastes bold content over the selection, saves formatting and preserves existing tags", async () => {
  const post: Post = {
    id: "post-1", title: "Collection reminder", body: "Hello old text!", category: "Waste Tip",
    status: "Draft", featured: false, author: "MENRO", publishedDate: null,
    lastEdited: "Oct 22, 2026", views: 0, likes: 0, tags: ["recycling"], images: [], scheduledDate: null,
  };
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<PostEditor editingPost={post} onBack={vi.fn()} onSave={onSave} isSaving={false} />);
  expect(screen.queryByPlaceholderText(/comma-separated/)).toBeNull();
  const body = screen.getByRole("textbox", { name: "Post Body" });
  const range = document.createRange();
  range.setStart(body.firstChild!, 6);
  range.setEnd(body.firstChild!, 14);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent.paste(body, { clipboardData: { getData: (type: string) => type === "text/html" ? '<strong>GreenWay</strong> #recycling' : 'GreenWay #recycling' } });
  expect(body).toHaveTextContent("Hello GreenWay #recycling!");
  expect(body.querySelector("strong")).toHaveTextContent("GreenWay");
  expect(body.textContent).not.toContain("**");
  expect(screen.queryByText(/Pasted bold text is kept/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ body: "Hello **GreenWay** #recycling!", tags: "recycling" })));
});

it("reopens saved bold text as formatted text and keeps native editing line breaks", () => {
  const onChange = vi.fn();
  const { rerender } = render(<PostBodyInput value="Hello **GreenWay**" onChange={onChange} />);
  const body = screen.getByRole("textbox", { name: "Post Body" });
  expect(body.querySelector("strong")).toHaveTextContent("GreenWay");
  expect(body.textContent).toBe("Hello GreenWay");
  body.innerHTML = 'First line<div><strong>Second line</strong></div><div><br></div><div>Third line</div>';
  fireEvent.input(body);
  expect(onChange).toHaveBeenLastCalledWith("First line\n**Second line**\n\nThird line");
  rerender(<PostBodyInput value="" onChange={onChange} />);
  expect(body).toHaveAttribute("data-empty", "true");
  expect(body.textContent).toBe("");
});

it("inserts plain pasted text safely and keeps scripts out of the editor", () => {
  const onChange = vi.fn();
  render(<PostBodyInput value="" onChange={onChange} />);
  const body = screen.getByRole("textbox", { name: "Post Body" });
  fireEvent.paste(body, { clipboardData: { getData: (type: string) => type === "text/plain" ? '<script>alert(1)</script> Plain text' : '' } });
  expect(body.querySelector("script")).toBeNull();
  expect(body.textContent).toBe('<script>alert(1)</script> Plain text');
  expect(onChange).toHaveBeenLastCalledWith('<script>alert(1)</script> Plain text');
});
