import { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "@/app/routes/ProtectedRoute";
import useAuthStore from "@/store/authStore";
import HeroSection from "./HeroSection";
import Navbar from "./Navbar";

beforeEach(() => {
  useAuthStore.getState().clearAuth();
  useAuthStore.setState({ hasHydrated: true });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  useAuthStore.getState().clearAuth();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("downloads the bundled Android APK by default", () => {
  vi.stubEnv("VITE_RESIDENT_APK_URL", "");
  render(<MemoryRouter><HeroSection /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Download GreenWay for Android" })).toHaveAttribute("href", "/downloads/greenway-candelaria.apk");
  expect(screen.queryByText("Download available soon.")).not.toBeInTheDocument();
  expect(screen.getByText(/Android only/)).toBeInTheDocument();
});

it("links directly to the configured APK release", () => {
  vi.stubEnv("VITE_RESIDENT_APK_URL", "https://downloads.example.test/resident.apk");
  render(<MemoryRouter><HeroSection /></MemoryRouter>);
  const download = screen.getByRole("link", { name: "Download GreenWay for Android" });
  expect(download).toHaveAttribute("href", "https://downloads.example.test/resident.apk");
  expect(download).toHaveAttribute("download");
  expect(screen.queryByText("Download available soon.")).not.toBeInTheDocument();
});

it("preserves the resident destination for Start Tracking when signed in", () => {
  useAuthStore.setState({ isAuthenticated: true, token: "fixture-token" });
  render(<MemoryRouter><Routes>
    <Route path="/" element={<HeroSection />} />
    <Route path="/resident" element={<h1>Resident portal</h1>} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Start Tracking" }));
  expect(screen.getByRole("heading", { name: "Resident portal" })).toBeInTheDocument();
});

it("opens guest login directly without visiting a protected page or remounting the hero", async () => {
  const paths: string[] = [];
  function RecordPath() {
    const { pathname } = useLocation();
    useEffect(() => { paths.push(pathname); }, [pathname]);
    return null;
  }
  const landing = <><Navbar /><HeroSection /></>;
  render(<MemoryRouter>
    <RecordPath />
    <Routes>
      <Route path="/" element={landing} />
      <Route path="/login" element={landing} />
      <Route path="/resident" element={<ProtectedRoute allowedRoles={["RESIDENT"]}><h1>Resident portal</h1></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>);
  const heroHeading = screen.getByRole("heading", { level: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Start Tracking" }));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(paths).toEqual(["/", "/login"]);
  expect(screen.getByRole("heading", { level: 1, hidden: true })).toBe(heroHeading);
  fireEvent.click(screen.getByRole("button", { name: "Close authentication dialog" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(paths).toEqual(["/", "/login", "/"]);
});

it("keeps Learn More scrolling to How GreenWay Works", () => {
  const scrollIntoView = vi.fn();
  render(<MemoryRouter><HeroSection /><section id="how-it-works">How GreenWay Works</section></MemoryRouter>);
  const howItWorks = screen.getByText("How GreenWay Works");
  howItWorks.scrollIntoView = scrollIntoView;
  fireEvent.click(screen.getByRole("button", { name: "Learn More" }));
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
});
