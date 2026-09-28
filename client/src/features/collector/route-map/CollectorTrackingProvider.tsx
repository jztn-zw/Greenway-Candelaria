import { type ReactNode } from "react";
import { useRouteData } from "./hooks/useRouteData";
import { useLiveTracking } from "./hooks/useLiveTracking";

import { CollectorTrackingContext as Context } from "./useCollectorTracking";
export const CollectorTrackingProvider = ({ children }: { children: ReactNode }) => {
  const route = useRouteData();
  const tracking = useLiveTracking({
    truckId: route.routeInfo?.truckId ?? null, routeId: route.routeInfo?.routeId ?? null,
    isRouteEnded: !route.routeInfo,
    isTrackingEnabled: Boolean(route.routeInfo?.collectionStartedAt && route.routeInfo.routeStatus === "ACTIVE"),
  });
  return <Context.Provider value={{ ...route, ...tracking }}>{children}</Context.Provider>;
};
