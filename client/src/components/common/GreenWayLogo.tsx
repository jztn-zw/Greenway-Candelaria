import { cn } from "@/lib/utils";

/** The supplied truck-and-leaf mark, tinted with the current theme's brand color. */
export default function GreenWayLogo({ className, alt = "GreenWay Logo" }: { className?: string; alt?: string }) {
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
