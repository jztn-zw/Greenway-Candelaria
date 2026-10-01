import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("shared typography class merging", () => {
  it.each([
    "ui-overline", "ui-caption", "ui-label", "ui-body", "ui-title", "ui-page", "ui-page-lg",
  ])("keeps the %s size when a text color is applied", (size) => {
    expect(cn(`text-${size}`, "text-muted-foreground")).toBe(`text-${size} text-muted-foreground`);
  });

  it("allows a component to override size without dropping its color", () => {
    expect(cn("text-ui-body text-foreground", "text-sm")).toBe("text-foreground text-sm");
  });

  it("keeps base size and color while overriding only the responsive size", () => {
    expect(cn("text-ui-page sm:text-ui-page-lg text-foreground", "sm:text-2xl"))
      .toBe("text-ui-page text-foreground sm:text-2xl");
  });
});
