import { trackingStopPresentation } from "../utils/trackingStopPresentation";

export default function AdminTrackingLegend() {
  return (
    <div role="group" aria-label="Stop map legend" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {Object.values(trackingStopPresentation).map(item => (
        <span key={item.label} className="flex items-center gap-1">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
