import { afterEach, expect, it, vi } from "vitest";
import { handleLandingNavigation } from "./navigation";

afterEach(() => { document.body.innerHTML = ""; window.history.replaceState(null, "", "/"); vi.restoreAllMocks(); });

it.each([
  { reduced: false, behavior: "smooth" },
  { reduced: true, behavior: "auto" },
])("uses $behavior anchor scrolling when reduced motion is $reduced", ({ reduced, behavior }) => {
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: reduced } as MediaQueryList);
  const section = document.createElement("section");
  section.id = "how-it-works";
  section.scrollIntoView = vi.fn();
  document.body.appendChild(section);
  const navigate = vi.fn();
  handleLandingNavigation("#how-it-works", navigate);
  expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior, block: "start" });
  expect(window.location.hash).toBe("#how-it-works");
  expect(navigate).not.toHaveBeenCalled();
});
