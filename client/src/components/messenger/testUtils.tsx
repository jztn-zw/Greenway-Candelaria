import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach } from "vitest";
export { act };
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = [];
export const render = (node: ReactNode) => {
  const host = document.createElement("div"); document.body.appendChild(host);
  const root = createRoot(host); const client = new QueryClient(); notifyManager.setScheduler(queueMicrotask); mounted.push({ root, host, client }); root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
};
afterEach(() => { for (const { root, host, client } of mounted.splice(0)) { act(() => root.unmount()); host.remove(); client.clear(); } notifyManager.setScheduler((callback) => setTimeout(callback, 0)); });
const matches = (value: string, expected?: string | RegExp) => expected === undefined || (typeof expected === "string" ? value === expected : expected.test(value));
const roleSelectors: Record<string, string> = { button: "button", textbox: "input", alert: '[role="alert"]', status: '[role="status"]' };
const byRole = (role: string, options?: { name?: string | RegExp }) => [...document.querySelectorAll<HTMLElement>(roleSelectors[role] || `[role="${role}"]`)].filter((element) => matches(element.getAttribute("aria-label") || element.textContent || "", options?.name));
const byText = (text: string) => [...document.querySelectorAll<HTMLElement>("body *")].filter((element) => element.textContent === text && ![...element.children].some((child) => child.textContent === text));
const required = (elements: HTMLElement[]) => { if (elements.length !== 1) throw new Error(`Expected one matching element, received ${elements.length}`); return elements[0]; };
export const screen = {
  getByRole: (role: string, options?: { name?: string | RegExp }) => required(byRole(role, options)),
  queryByRole: (role: string, options?: { name?: string | RegExp }) => byRole(role, options)[0] || null,
  getByText: (text: string) => required(byText(text)), queryByText: (text: string) => byText(text)[0] || null,
  getAllByText: byText,
  getByLabelText: (text: string) => { const label = [...document.querySelectorAll("label")].find((element) => element.textContent === text); const element = label && document.getElementById(label.htmlFor); if (!element) throw new Error("Label target missing"); return element; },
};
export const fireEvent = {
  click: (element: HTMLElement) => act(() => { element.dispatchEvent(new MouseEvent("click", { bubbles: true })); }),
  change: (element: HTMLElement, event: { target: { value: string } }) => act(() => {
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, event.target.value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  }),
};
