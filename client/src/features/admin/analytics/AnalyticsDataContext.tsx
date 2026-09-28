import { createContext, useContext } from "react";
import type { AnalyticsDashboardData } from "./analytics.types";

const AnalyticsDataContext = createContext<AnalyticsDashboardData | null>(null);

export const AnalyticsDataProvider = AnalyticsDataContext.Provider;

export const useAnalyticsData = () => {
  const data = useContext(AnalyticsDataContext);
  if (!data) throw new Error("Analytics sections must be rendered inside AnalyticsDataProvider.");
  return data;
};
