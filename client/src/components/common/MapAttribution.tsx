import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MapAttribution({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timer.current = setTimeout(() => setExpanded(false), 5000);
    return () => clearTimeout(timer.current);
  }, []);

  return <div onFocus={() => clearTimeout(timer.current)}
    className={cn("absolute bottom-0 left-0 z-[500] flex max-w-full items-center gap-0.5 text-[hsl(var(--neutral-900))]", className)}
    style={{ textShadow: "0 0 3px hsl(var(--map-inset)), 0 0 3px hsl(var(--map-inset))" }}>
    <button type="button" aria-label="Map information" aria-expanded={expanded} aria-controls={id}
      className="flex size-8 shrink-0 items-center justify-center bg-transparent p-0 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => { clearTimeout(timer.current); setExpanded(value => !value); }}>
      <Info className="size-4 drop-shadow-[0_0_2px_hsl(var(--map-inset))]" aria-hidden="true" />
    </button>
    <span id={id} hidden={!expanded} className="text-ui-caption">
      © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"
        className="rounded-sm underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">OpenStreetMap contributors</a>
    </span>
  </div>;
}
