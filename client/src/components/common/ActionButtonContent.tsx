import { type ReactNode } from "react";
import ActionButtonLoader from "@/components/common/ActionButtonLoader";

interface ActionButtonContentProps {
  loading: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

/** Keep both labels in the layout so the button does not resize while they crossfade. */
const ActionButtonContent = ({ loading, loadingLabel, children }: ActionButtonContentProps) => {
  const visibleLoadingLabel = loadingLabel ?? "Working…";

  return (
    <>
      <span className="gw-button-label" aria-hidden={loading || undefined}>{children}</span>
      {loading && <span className="gw-button-loader" data-loading-copy={visibleLoadingLabel} aria-hidden="true">
        <span className="gw-button-loader-truck"><ActionButtonLoader /></span>
      </span>}
      {loading && <span className="sr-only" role="status">{loadingLabel ?? "Working…"}</span>}
    </>
  );
};

export default ActionButtonContent;
