import { afterEach, describe, expect, it } from "vitest";
import { readThemeColor } from "./themeColors";

afterEach(() => document.documentElement.removeAttribute("style"));

describe("canvas theme colors", () => {
  it("reads the current global color when the theme changes", () => {
    document.documentElement.style.setProperty("--primary", "175.34 77.444% 26.078%");
    expect(readThemeColor("primary")).toBe("hsl(175.34 77.444% 26.078%)");
    document.documentElement.style.setProperty("--primary", "158.113 64.372% 51.569%");
    expect(readThemeColor("primary")).toBe("hsl(158.113 64.372% 51.569%)");
  });

  it("does not invent a second palette when CSS has no color", () => {
    expect(readThemeColor("missing-token")).toBe("transparent");
  });
});
