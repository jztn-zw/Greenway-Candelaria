import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ResetDriverPasswordDialog from "./ResetDriverPasswordDialog";
import { resetDriverPassword } from "@/services/driverManagerService";
import type { Driver } from "../types";

vi.mock("@/lib/adminQuery", () => ({ useAdminMutation: (action: unknown) => action }));
vi.mock("@/services/driverManagerService", () => ({ resetDriverPassword: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("submits the body form from the shared footer and protects the pending reset", async () => {
  let finish!: () => void;
  vi.mocked(resetDriverPassword).mockImplementation(() => new Promise(resolve => { finish = () => resolve(undefined); }));
  const onClose = vi.fn();
  render(<ResetDriverPasswordDialog driver={{ id: "collector-fixture", fullName: "Collector Example" } as Driver} onClose={onClose} />);
  const password = screen.getByLabelText("New Password");
  const save = screen.getByRole<HTMLButtonElement>("button", { name: "Save Password" });
  expect(save.form).toBe(password.closest("form"));
  fireEvent.change(password, { target: { value: "new-password" } });
  fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "new-password" } });
  fireEvent.click(save);
  expect(resetDriverPassword).toHaveBeenCalledExactlyOnceWith("collector-fixture", "new-password");
  expect(screen.getByRole("button", { name: "Close password reset" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(onClose).toHaveBeenCalledOnce();
});
