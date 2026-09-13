import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// This component is used by the three application sidebars. Keeping a very
// short shared cooldown prevents rapid menu clicks from mounting several
// data-heavy pages at once while preserving normal navigation.
const SIDEBAR_NAVIGATION_COOLDOWN_MS = 750;
let lastSidebarNavigationAt = 0;

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onClick, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onClick={(event) => {
          onClick?.(event);

          // Do not interfere with a caller that deliberately prevented the
          // navigation, or with browser-native new-tab/window shortcuts.
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }

          const now = performance.now();
          if (now - lastSidebarNavigationAt < SIDEBAR_NAVIGATION_COOLDOWN_MS) {
            event.preventDefault();
            return;
          }

          lastSidebarNavigationAt = now;
        }}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
