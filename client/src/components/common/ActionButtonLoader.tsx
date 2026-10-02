import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { memo, useId } from "react";
import loadingTruck from "@/assets/greenway-loading.lottie?url";
import { cn } from "@/lib/utils";

/** The truck inherits the button foreground, including its light/dark theme. */
const ActionButtonLoader = memo(({ className }: { className?: string }) => {
  const colorFilterId = `action-truck-${useId().replace(/:/g, "")}`;

  return (
    <span aria-hidden="true" className={cn("gw-action-loader", className)}>
      <svg className="gw-action-loader-filter" focusable="false">
        <defs>
          <filter id={colorFilterId} colorInterpolationFilters="sRGB">
            {/* Small canvas strokes lose opacity when scaled down. Strengthen
                their coverage while keeping empty pixels transparent. */}
            <feComponentTransfer in="SourceAlpha" result="truckMask">
              <feFuncA type="linear" slope="2" />
            </feComponentTransfer>
            <feFlood floodColor="currentColor" floodOpacity="1" result="truckColor" />
            <feComposite in="truckColor" in2="truckMask" operator="in" />
          </filter>
        </defs>
      </svg>
      <span className="gw-action-loader-artwork" style={{ filter: `url(#${colorFilterId})` }}>
        <DotLottieReact src={loadingTruck} loop autoplay className="gw-action-loader-canvas" />
      </span>
    </span>
  );
});

ActionButtonLoader.displayName = "ActionButtonLoader";

export default ActionButtonLoader;
