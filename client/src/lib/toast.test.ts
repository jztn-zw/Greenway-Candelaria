import { beforeEach, expect, it, vi } from "vitest";
const sonner = vi.hoisted(() => Object.assign(vi.fn(), {
  success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), dismiss: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: sonner }));
import { toast } from "./toast";
beforeEach(() => vi.clearAllMocks());

it("preserves original wording, punctuation and spacing when there are no emojis", () => {
  toast.success("Report submitted successfully!", { description: "Please  keep your reference number." });
  expect(sonner.success).toHaveBeenCalledWith("Report submitted successfully!", expect.objectContaining({ description: "Please  keep your reference number." }));
});

it("removes emojis from toast titles and descriptions without changing meaningful text", () => {
  toast.success("Account created 👋", { description: "You can sign in ✅" });
  expect(sonner.success).toHaveBeenCalledWith("Account created", expect.objectContaining({ description: "You can sign in" }));
});

it("removes joined emojis, flags and keycaps while preserving ordinary numbers", () => {
  toast("👩🏽‍💻 Report 123 🇵🇭 1️⃣ submitted", { duration: 5000 });
  expect(sonner).toHaveBeenCalledWith("Report 123 submitted", expect.objectContaining({ duration: 5000 }));
});

it("does not leave an empty description when it contained only emojis", () => {
  toast.success("Account created", { description: "✅" });
  expect(sonner.success).toHaveBeenCalledWith("Account created", expect.objectContaining({ description: undefined }));
});

it("preserves existing routine-success and information suppression", () => {
  toast.success("Profile updated ✅");
  toast.info("Collection reminder enabled");
  expect(sonner.success).not.toHaveBeenCalled();
  expect(sonner.info).not.toHaveBeenCalled();
});

it("keeps validation instructions and safe error wording", () => {
  toast.error("Please enter a reason ⚠️");
  expect(sonner.error).toHaveBeenCalledWith("Please enter a reason");
  toast.error("SQL error: sensitive internal details");
  expect(sonner.error).toHaveBeenLastCalledWith("Could not complete that action. Please try again.");
});

it("keeps warning descriptions hidden and available-item notices intact", () => {
  toast.warning("Stop skipped ⚠️", { description: "Private details" });
  expect(sonner.warning).toHaveBeenCalledWith("Stop skipped", expect.objectContaining({ description: undefined }));
  toast.info("This announcement is no longer available. 📣");
  expect(sonner.info).toHaveBeenCalledWith("This announcement is no longer available.", undefined);
});
