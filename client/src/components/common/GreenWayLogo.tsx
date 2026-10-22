import { cn } from "@/lib/utils";
import { useId } from "react";

/** The supplied truck-and-leaf mark, tinted with the current theme's brand color. */
export default function GreenWayLogo({ className, alt = "GreenWay Logo", variant = "mark" }: { className?: string; alt?: string; variant?: "mark" | "wordmark" }) {
  const maskId = useId();
  if (variant === "wordmark") return (
    <svg
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn("inline-block h-4 w-28 shrink-0 text-primary", className)}
      viewBox="20 848 1220 182"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="20" y="848" width="1220" height="182" style={{ maskType: "alpha" }}>
          <image href="/greenway-brand-source.png" width="1254" height="1254" />
        </mask>
      </defs>
      <rect x="20" y="848" width="1220" height="182" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn("inline-block size-8 shrink-0 bg-current text-primary", className)}
      style={{
        mask: "url('/greenway.svg') center / contain no-repeat",
        WebkitMask: "url('/greenway.svg') center / contain no-repeat",
      }}
    />
  );
}
