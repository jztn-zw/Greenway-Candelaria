import { createContext, useContext } from "react";
import type { useRouteData } from "./hooks/useRouteData";
import type { useLiveTracking } from "./hooks/useLiveTracking";
type TrackingContext = ReturnType<typeof useRouteData> & ReturnType<typeof useLiveTracking>;
export const CollectorTrackingContext = createContext<TrackingContext | null>(null);
export const useCollectorTracking = () => {
  const value = useContext(CollectorTrackingContext);
  if (!value) throw new Error("Collector tracking must be inside its provider");
  return value;
};
