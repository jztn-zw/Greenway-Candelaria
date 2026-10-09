import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AppDownloadSection from "./AppDownloadSection";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it.each(["", "   "])("keeps installation disabled without a configured APK (%j)", (url) => {
  vi.stubEnv("VITE_RESIDENT_APK_URL", url);
  render(<AppDownloadSection />);
  expect(screen.getByRole("button", { name: "Install GreenWay App" })).toBeDisabled();
  expect(screen.queryByRole("link", { name: "Install GreenWay App" })).not.toBeInTheDocument();
  expect(screen.queryByText("Download available soon.")).not.toBeInTheDocument();
});

it("downloads the same configured Android release as the hero", () => {
  vi.stubEnv("VITE_RESIDENT_APK_URL", " https://downloads.example.test/resident.apk ");
  render(<AppDownloadSection />);
  const download = screen.getByRole("link", { name: "Install GreenWay App" });
  expect(download).toHaveAttribute("href", "https://downloads.example.test/resident.apk");
  expect(download).toHaveAttribute("download");
});
