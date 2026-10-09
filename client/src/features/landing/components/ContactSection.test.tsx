import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ContactSection from "./ContactSection";

afterEach(cleanup);

it("provides direct links to MENRO's hotline, email, and municipal website", () => {
  render(<ContactSection />);
  expect(screen.getByRole("link", { name: /Hotline.*383/i })).toHaveAttribute("href", "tel:383");
  expect(screen.getByRole("link", { name: /menro@candelaria.gov.ph/i })).toHaveAttribute("href", "mailto:menro@candelaria.gov.ph");
  const website = screen.getByRole("link", { name: /Municipal Website/i });
  expect(website).toHaveAttribute("href", "https://www.candelaria.gov.ph");
  expect(website).toHaveAttribute("rel", "noopener noreferrer");
});
