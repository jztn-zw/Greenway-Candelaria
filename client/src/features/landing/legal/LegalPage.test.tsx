import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import LegalPage from "./LegalPage";

afterEach(cleanup);

it("navigates between public policies and labels them as handover review drafts", () => {
  render(<MemoryRouter initialEntries={["/terms"]}><Routes>
    <Route path="/terms" element={<LegalPage policy="terms" />} />
    <Route path="/privacy" element={<LegalPage policy="privacy" />} />
  </Routes></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Terms of Use", level: 1 })).toBeInTheDocument();
  expect(screen.getByText("For MENRO Review")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("link", { name: "Privacy Notice" })[0]);
  expect(screen.getByRole("heading", { name: "Privacy Notice", level: 1 })).toBeInTheDocument();
  expect(document.title).toBe("Privacy Notice | GreenWay");
  expect(screen.getByText(/final personal information controller/)).toBeInTheDocument();
  const contentsLink = screen.getByRole("link", { name: /Retention and Account Deactivation/ });
  expect(contentsLink).toHaveAttribute("href", "#retention");
  expect(document.getElementById("retention")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "menro@candelaria.gov.ph" })).toHaveAttribute("href", "mailto:menro@candelaria.gov.ph");
});
