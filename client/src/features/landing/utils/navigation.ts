import type { NavigateFunction } from "react-router-dom";

const isExternalUrl = (target: string) => /^https?:\/\//i.test(target);

const scrollToHash = (hash: string) => {
  const target = document.querySelector(hash);
  if (!target) return false;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", hash);
  }
  return true;
};

export const handleLandingNavigation = (
  target: string,
  navigate: NavigateFunction,
) => {
  const nextTarget = String(target || "").trim();
  if (!nextTarget) return;

  if (nextTarget.startsWith("#")) {
    if (scrollToHash(nextTarget)) return;

    navigate(`/${nextTarget}`);
    window.setTimeout(() => {
      scrollToHash(nextTarget);
    }, 50);
    return;
  }

  if (nextTarget.startsWith("/")) {
    navigate(nextTarget);
    return;
  }

  if (isExternalUrl(nextTarget)) {
    window.location.assign(nextTarget);
    return;
  }

  navigate(`/${nextTarget}`);
};
