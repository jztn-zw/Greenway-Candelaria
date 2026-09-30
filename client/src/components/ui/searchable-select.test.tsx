import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SearchableSelect, type SearchableSelectOption } from "./searchable-select";

const options = (count: number): SearchableSelectOption[] => Array.from({ length: count }, (_, index) => ({ value: `id-${index}`, label: `Choice ${index}` }));
const Harness = ({ choices }: { choices: SearchableSelectOption[] }) => {
  const [value, setValue] = useState("");
  return <><SearchableSelect aria-label="Choice" value={value} onValueChange={setValue} options={choices} /><output>{value}</output></>;
};
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.unstubAllGlobals();
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
const renderChoices = async (choices: SearchableSelectOption[]) => { await act(async () => root.render(<Harness choices={choices} />)); };
const trigger = () => host.querySelector<HTMLButtonElement>('button[aria-label="Choice"]')!;
const search = () => document.querySelector<HTMLInputElement>('input[placeholder="Search options..."]');
const visibleOptions = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const open = async () => { await act(async () => trigger().click()); };
const keyDown = async (element: Element, key: string) => { await act(async () => { element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); }); };
const changeSearch = async (value: string) => { await act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search()!, value);
  search()!.dispatchEvent(new Event("input", { bubbles: true }));
}); };

it.each([9, 10, 15])("shows a search field only when the complete list has at least ten choices (%i)", async (count) => {
  await renderChoices(options(count)); await open();
  expect(Boolean(search())).toBe(count >= 10);
  expect(visibleOptions()).toHaveLength(count);
});

it("filters labels, selects the original ID, and clears the search on reopening", async () => {
  await renderChoices(options(10)); await open();
  await changeSearch("Choice 9");
  expect(visibleOptions()).toHaveLength(1);
  expect(search()).toBeVisible();
  await keyDown(search()!, "Enter");
  expect(document.querySelector("output")).toHaveTextContent("id-9");
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  await open();
  expect(search()).toHaveValue("");
  expect(visibleOptions()).toHaveLength(10);
  expect(trigger()).toHaveTextContent("Choice 9");
});

it("supports keyboard selection when fewer than ten choices need no search field", async () => {
  await renderChoices(options(3));
  await keyDown(trigger(), "ArrowDown");
  expect(search()).toBeNull();
  await keyDown(document.activeElement!, "Enter");
  expect(document.querySelector("output")).toHaveTextContent("id-0");
});

it("keeps choices with identical labels distinct and searches additional keywords", async () => {
  const choices = options(8).concat([{ value: "truck-a", label: "Collection truck", keywords: "ABC-123" }, { value: "truck-b", label: "Collection truck", keywords: "DEF-456" }]);
  await renderChoices(choices); await open();
  await changeSearch("DEF-456");
  expect(visibleOptions()).toHaveLength(1);
  await act(async () => visibleOptions()[0].click());
  expect(document.querySelector("output")).toHaveTextContent("truck-b");
});

it("shows an empty search without changing the selection and closes on Escape", async () => {
  await renderChoices(options(10)); await open();
  await changeSearch("Missing option");
  expect(document.querySelector('[cmdk-empty]')).toHaveTextContent("No options found.");
  expect(visibleOptions()).toHaveLength(0);
  await keyDown(search()!, "Escape");
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.querySelector("output")).toBeEmptyDOMElement();
});
