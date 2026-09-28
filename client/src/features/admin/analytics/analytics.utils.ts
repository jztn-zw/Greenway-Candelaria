import type { AnalyticsDashboardData } from "./analytics.types";

export const withDriverChartLabels = (drivers: AnalyticsDashboardData["driverOperations"]) => {
  const nameCounts = new Map<string, number>();
  drivers.forEach((driver) => nameCounts.set(driver.name, (nameCounts.get(driver.name) ?? 0) + 1));

  return drivers.map((driver) => ({
    ...driver,
    label: (nameCounts.get(driver.name) ?? 0) > 1
      ? `${driver.name} (${driver.id.slice(0, 4)})`
      : driver.name,
  }));
};
