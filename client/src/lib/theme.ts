import { flushSync } from "react-dom";

export type ThemeMode = "light" | "dark";

const THEME_CHANGE_EVENT = "greenway:theme-change";
let changeId = 0;
let pendingMode: ThemeMode | null = null;
let activeTransition: Pick<ViewTransition, "skipTransition"> | null = null;

export const getThemeMode = (): ThemeMode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export const subscribeThemeMode = (onChange: () => void) => {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    observer.disconnect();
  };
};

/** Fade the entire interface together so local hover transitions cannot trail behind. */
export const setThemeMode = (mode: ThemeMode) => {
  if (mode === (pendingMode ?? getThemeMode())) return;

  const currentChange = ++changeId;
  activeTransition?.skipTransition();
  activeTransition = null;
  pendingMode = mode;
  const root = document.documentElement;
  root.classList.add("theme-switching");

  const finish = () => {
    if (currentChange !== changeId) return;
    root.classList.remove("theme-switching");
    pendingMode = null;
    activeTransition = null;
  };

  const apply = () => {
    if (currentChange !== changeId) return;
    // Theme consumers, including the controls and canvas charts, update before
    // the browser captures the new view rather than one render after it.
    flushSync(() => {
      root.classList.toggle("dark", mode === "dark");
      localStorage.setItem("theme", mode);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    });
  };

  const applyWithoutAnimation = () => {
    apply();
    // Commit the colors with local transitions suppressed before restoring them.
    void root.offsetWidth;
    requestAnimationFrame(finish);
  };

  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyWithoutAnimation();
    return;
  }

  try {
    const transition = document.startViewTransition(apply);
    activeTransition = transition;
    // A skipped transition rejects ready, but still applies its update callback.
    void transition.ready.catch(() => undefined);
    void transition.finished.then(finish, finish);
  } catch {
    applyWithoutAnimation();
  }
};

export const toggleThemeMode = () =>
  setThemeMode((pendingMode ?? getThemeMode()) === "dark" ? "light" : "dark");
