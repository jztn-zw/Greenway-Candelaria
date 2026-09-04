import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Plus } from "lucide-react";

interface RouteEmptyStateProps {
  onCreateNew: () => void;
}

const RouteEmptyState = ({ onCreateNew }: RouteEmptyStateProps) => (
  <Card className="border border-dashed border-border h-full min-h-[400px] flex items-center justify-center">
    <div className="text-center space-y-3 px-6">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
        <Route className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No route selected</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        Select a route from the list or create a new one to get started. Routes define the order trucks visit barangays during collection.
      </p>
      <Button variant="outline" onClick={onCreateNew} className="gap-2 mt-2">
        <Plus className="w-4 h-4" />
        Create New Route
      </Button>
    </div>
  </Card>
);

export default RouteEmptyState;
