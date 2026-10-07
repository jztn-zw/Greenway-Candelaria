import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AdminFilterDialog, AdminFilterField } from "./AdminFilterDialog";

afterEach(cleanup);

function Filters({ applied, initialStatus = "all" }: { applied: (value: { status: string }) => void; initialStatus?: string }) {
  const [values, setValues] = useState({ status: initialStatus });
  return <>
    <button onClick={() => setValues({ status: "resolved" })}>Update applied filters</button>
    <AdminFilterDialog title="Filter Reports" values={values}
      onApply={next => { setValues(next); applied(next); }} resetValues={{ status: "all" }}
      activeCount={Number(values.status !== "all")}>
      {(draft, setDraft) => <AdminFilterField label="Status">
        <select aria-label="Status" value={draft.status} onChange={event => setDraft({ status: event.target.value })}>
          <option value="all">All</option><option value="resolved">Resolved</option>
        </select>
      </AdminFilterField>}
    </AdminFilterDialog>
  </>;
}

const openFilters = () => {
  fireEvent.click(screen.getByRole("button", { name: "Open filter reports" }));
  return screen.getByRole("dialog");
};
const changeStatus = (dialog: HTMLElement, value: string) => fireEvent.change(within(dialog).getByRole("combobox", { name: "Status" }), { target: { value } });

it("stages edits and applies once when Apply is clicked", () => {
  const applied = vi.fn();
  render(<Filters applied={applied} />);
  const dialog = openFilters();
  changeStatus(dialog, "resolved");
  expect(applied).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply Filters" }));
  expect(applied).toHaveBeenCalledExactlyOnceWith({ status: "resolved" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(within(openFilters()).getByRole("combobox", { name: "Status" })).toHaveValue("resolved");
});

it.each(["Close filters", "Escape"])("discards unapplied changes on %s", (action) => {
  const applied = vi.fn();
  render(<Filters applied={applied} />);
  const dialog = openFilters();
  changeStatus(dialog, "resolved");
  if (action === "Escape") fireEvent.keyDown(dialog, { key: "Escape" });
  else fireEvent.click(within(dialog).getByRole("button", { name: action }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(applied).not.toHaveBeenCalled();
  expect(within(openFilters()).getByRole("combobox", { name: "Status" })).toHaveValue("all");
});

it("stages Reset without clearing applied filters until Apply", () => {
  const applied = vi.fn();
  render(<Filters applied={applied} initialStatus="resolved" />);
  const dialog = openFilters();
  fireEvent.click(within(dialog).getByRole("button", { name: /^Reset filters$/i }));
  expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveValue("all");
  expect(applied).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close filters" }));
  const reopened = openFilters();
  expect(within(reopened).getByRole("combobox", { name: "Status" })).toHaveValue("resolved");
  fireEvent.click(within(reopened).getByRole("button", { name: /^Reset filters$/i }));
  fireEvent.click(within(reopened).getByRole("button", { name: "Apply Filters" }));
  expect(applied).toHaveBeenCalledExactlyOnceWith({ status: "all" });
});

it("starts each opening from the latest applied filters", () => {
  render(<Filters applied={vi.fn()} />);
  fireEvent.click(within(openFilters()).getByRole("button", { name: "Close filters" }));
  fireEvent.click(screen.getByRole("button", { name: "Update applied filters" }));
  expect(within(openFilters()).getByRole("combobox", { name: "Status" })).toHaveValue("resolved");
});
