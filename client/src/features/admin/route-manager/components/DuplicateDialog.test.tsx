import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DuplicateDialog from "./DuplicateDialog";

afterEach(cleanup);
it("continues to an unsaved draft without requiring the source assignment", () => {
  const duplicate = vi.fn();
  render(<DuplicateDialog open onOpenChange={vi.fn()} targetDay="Thursday" sourceDay="Monday"
    setTargetDay={vi.fn()} onDuplicate={duplicate} />);
  expect(screen.getByRole("button", { name: "Continue to Editor" })).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" }));
  expect(duplicate).toHaveBeenCalledOnce();
});
it("allows an available day and explains that finished collections do not restart", () => {
  render(<DuplicateDialog open onOpenChange={vi.fn()} targetDay="Friday" sourceDay="Monday"
    setTargetDay={vi.fn()} onDuplicate={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Continue to Editor" })).not.toBeDisabled();
  expect(screen.getByText(/next occurrence/)).toBeInTheDocument();
});
