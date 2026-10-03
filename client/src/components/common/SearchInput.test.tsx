import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

vi.mock("./ActionButtonLoader", () => ({ default: () => <span aria-hidden="true" /> }));

afterEach(cleanup);

it("clears the current query once and restores focus without submitting its form", () => {
  const changed = vi.fn();
  const cleared = vi.fn();
  const submitted = vi.fn();
  function Harness() {
    const [value, setValue] = useState("Collection");
    return <form onSubmit={submitted}>
      <SearchInput value={value} placeholder="Search posts" onChange={(next) => { changed(next); setValue(next); }} onClear={cleared} />
    </form>;
  }
  render(<Harness />);
  const input = screen.getByRole("textbox", { name: "Search posts" });
  fireEvent.change(input, { target: { value: "Recycling" } });
  expect(changed).toHaveBeenLastCalledWith("Recycling");
  changed.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(changed).toHaveBeenCalledExactlyOnceWith("");
  expect(cleared).toHaveBeenCalledOnce();
  expect(input).toHaveValue("");
  expect(input).toHaveFocus();
  expect(submitted).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
});

it.each([{ value: "" }, { value: "Query", disabled: true }, { value: "Query", readOnly: true }])("offers no clear action for empty or noneditable fields: %j", (props) => {
  render(<SearchInput {...props} onChange={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
});

it("preserves the caller's input reference, accessible name, and keyboard handler", () => {
  const keyDown = vi.fn();
  function Harness() {
    const ref = useRef<HTMLInputElement>(null);
    return <>
      <label id="query-label">Find residents</label>
      <SearchInput ref={ref} aria-labelledby="query-label" value="" onChange={vi.fn()} onKeyDown={keyDown} />
      <button onClick={() => ref.current?.focus()}>Focus search</button>
    </>;
  }
  render(<Harness />);
  const input = screen.getByRole("textbox", { name: "Find residents" });
  fireEvent.click(screen.getByRole("button", { name: "Focus search" }));
  expect(input).toHaveFocus();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(keyDown).toHaveBeenCalledOnce();
});

it("allows a pending search to be cleared while exposing its loading status", () => {
  const changed = vi.fn();
  render(<SearchInput value="Reference" onChange={changed} loading />);
  expect(screen.getByRole("textbox")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Searching…");
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(changed).toHaveBeenCalledExactlyOnceWith("");
});
