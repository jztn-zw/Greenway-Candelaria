import { useState, useEffect } from "react";

/**
 * Detects the current theme (light/dark) by watching the <html> class list.
 * Works with next-themes / shadcn theme toggle.
 */
export const useThemeMode = (): "light" | "dark" => {
  const [mode, setMode] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return mode;
};
