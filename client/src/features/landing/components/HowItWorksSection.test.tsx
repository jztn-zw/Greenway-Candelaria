import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import HowItWorksSection from "./HowItWorksSection";

afterEach(cleanup);

it("explains the three resident steps in order", () => {
  render(<HowItWorksSection />);
  const steps = within(screen.getByRole("list")).getAllByRole("listitem");
  expect(steps.map(step => within(step).getByRole("heading").textContent)).toEqual([
    "Set Up Your Profile", "Check Your Schedule", "Track and Report",
  ]);
});
