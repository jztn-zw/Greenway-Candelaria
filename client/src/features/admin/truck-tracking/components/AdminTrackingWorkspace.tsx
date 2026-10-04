import { useId, useRef, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Navigation, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminTruckTrackingStyles as styles } from "@/components/communityContentStyles";
import { cn } from "@/lib/utils";

type Props = {
  fleetOpen: boolean;
  onFleetOpenChange: (open: boolean) => void;
  fleetMinimized: boolean;
  fleetCount: number;
  map: ReactNode;
  children: ReactNode;
};

export default function AdminTrackingWorkspace({ fleetOpen, onFleetOpenChange, fleetMinimized, fleetCount, map, children }: Props) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closePanel = () => {
    onFleetOpenChange(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn(styles.workspace, fleetMinimized && "admin-tracking-workspace-minimized")}>
      <div className={styles.switcher}>
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Navigation className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Tracking map</span>
        </div>
        <Button ref={triggerRef} variant="outline" className="h-11 shrink-0 gap-2 rounded-xl px-3"
          aria-label="Open Fleet controls" aria-expanded={fleetOpen} aria-controls={panelId}
          onClick={() => onFleetOpenChange(!fleetOpen)}>
          <Truck className="size-4" aria-hidden="true" />
          Fleet <span className="rounded-md bg-muted px-1.5 text-ui-caption tabular-nums">{fleetCount}</span>
          {fleetOpen ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronUp className="size-3.5" aria-hidden="true" />}
        </Button>
      </div>
      <div className={styles.map}>{map}</div>
      {/* Keep replay controls mounted when the compact panel closes. */}
      <aside id={panelId} aria-label="Fleet controls"
        className={cn(styles.fleet, fleetMinimized && "admin-tracking-fleet-minimized", !fleetOpen && "admin-tracking-fleet-hidden")}
        onKeyDown={(event) => {
          if (event.key === "Escape" && fleetOpen) {
            event.stopPropagation();
            closePanel();
          }
        }}>
        <div className="admin-tracking-mobile-panel-header mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4 text-primary" aria-hidden="true" />Fleet controls</div>
          <Button variant="ghost" size="icon" className="size-11 rounded-xl" aria-label="Close fleet panel" onClick={closePanel}><X className="size-4" /></Button>
        </div>
        {children}
      </aside>
    </div>
  );
}
