import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AppDownloadSection from "./AppDownloadSection";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it.each(["", "   "])("downloads the supplied APK when no external release is configured (%j)", (url) => {
  vi.stubEnv("VITE_RESIDENT_APK_URL", url);
  render(<AppDownloadSection />);
  const download = screen.getByRole("link", { name: "Download GreenWay for Android" });
  expect(download).toHaveTextContent(/^Android$/);
  expect(download).toHaveClass("android-download-button");
  expect(download).toHaveAttribute("href", "/downloads/greenway-candelaria.apk");
  expect(download).toHaveAttribute("download", "GreenWay-Candelaria.apk");
  expect(screen.getByRole("button", { name: "iOS download not available" })).toBeDisabled();
  expect(screen.queryByText("Download available soon.")).not.toBeInTheDocument();
});

it("downloads the same configured Android release as the hero", () => {
  vi.stubEnv("VITE_RESIDENT_APK_URL", " https://downloads.example.test/resident.apk ");
  render(<AppDownloadSection />);
  const download = screen.getByRole("link", { name: "Download GreenWay for Android" });
  expect(download).toHaveAttribute("href", "https://downloads.example.test/resident.apk");
  expect(download).toHaveAttribute("download");
});
