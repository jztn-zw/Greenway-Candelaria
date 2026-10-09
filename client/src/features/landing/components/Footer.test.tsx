import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import Footer from "./Footer";

afterEach(cleanup);

it("links the footer navigation to the retained landing sections", () => {
  render(<Footer />);
  const navigation = screen.getByRole("navigation", { name: "Footer Navigation" });
  for (const [label, href] of [
    ["Home", "#home"], ["Weekly Guide", "#collection-schedule"],
    ["FAQ", "#faq"], ["Contact", "#contact"],
  ]) {
    expect(within(navigation).getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
});

it("provides direct MENRO phone and email links", () => {
  render(<Footer />);
  expect(screen.getByRole("link", { name: "Hotline: 383" })).toHaveAttribute("href", "tel:383");
  expect(screen.getByRole("link", { name: "menro@candelaria.gov.ph" })).toHaveAttribute("href", "mailto:menro@candelaria.gov.ph");
});
