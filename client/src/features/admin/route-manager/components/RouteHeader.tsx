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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Route className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">Route Manager</h1>
            <p className="text-sm text-muted-foreground">Build and manage collection routes for each truck</p>
          </div>
        </div>
        <Button onClick={onCreateNew} className="gap-2 self-start sm:self-auto shadow-sm">
          <Plus className="w-4 h-4" />
          Create New Route
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/80 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5 min-h-[78px]">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <kpi.icon className="w-[18px] h-[18px] text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl leading-tight font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RouteHeader;
