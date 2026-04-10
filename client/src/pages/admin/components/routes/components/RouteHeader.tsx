import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Plus, Play, MapPin } from "lucide-react";

interface RouteHeaderProps {
  totalRoutes: number;
  activeRoutes: number;
  coveredBarangays: number;
  totalBarangays: number;
  onCreateNew: () => void;
}

const RouteHeader = ({
  totalRoutes,
  activeRoutes,
  coveredBarangays,
  totalBarangays,
  onCreateNew,
}: RouteHeaderProps) => {
  const kpis = [
    { label: "Total Routes", value: totalRoutes, icon: Route },
    { label: "Active", value: activeRoutes, icon: Play },
    {
      label: "Barangays Covered",
      value: totalBarangays > 0 ? `${coveredBarangays}/${totalBarangays}` : `${coveredBarangays}`,
      icon: MapPin,
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Route className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Route Manager</h1>
            <p className="text-sm text-muted-foreground">Build and manage collection routes for each truck</p>
          </div>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Route
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <kpi.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RouteHeader;
