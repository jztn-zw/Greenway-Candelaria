import { useState, useCallback, useEffect } from "react";
import { MapPin, Plus } from "lucide-react";
import PickupPointKPIs from "./PickupPointKPIs";
import PickupPointMap from "./PickupPointMap";
import PickupPointList from "./PickupPointList";
import PickupPointDetail from "./PickupPointDetail";
import { mockPickupPoints } from "./mockData";
import type { PickupPoint } from "./types";
import { toast } from "sonner";
import {
  PageHeaderSkeleton, KPIRowSkeleton, MapPanelSkeleton,
} from "@/components/PageLoadingSkeletons";

const AdminPickupPoints = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [points, setPoints] = useState<PickupPoint[]>(mockPickupPoints);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPoint = selectedId ? points.find((p) => p.id === selectedId) || null : null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleVerify = useCallback((id: string) => {
    setPoints((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "verified" as const, verifiedAt: new Date().toISOString(), verifiedBy: "Admin" }
          : p
      )
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== id));
    setSelectedId(null);
  }, []);

  const handleFlag = useCallback((id: string) => {
    setPoints((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, flagged: !p.flagged } : p
      )
    );
  }, []);

  const handleDeactivate = useCallback((id: string) => {
    setPoints((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "deactivated" as const } : p
      )
    );
    setSelectedId(null);
  }, []);

  const handleAdd = useCallback(() => {
    toast.info("Add Pickup Point", { description: "Drop a pin on the map to set the location." });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <MapPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Pickup Points</h1>
              <p className="text-sm text-muted-foreground">
                {points.length} total points · {points.filter((p) => p.status === "verified").length} verified · {points.filter((p) => p.status === "pending").length} pending review
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] text-primary font-medium">Auto-discovery active</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <PickupPointKPIs points={points} />

      {/* Main Layout: Map + List + Detail */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {/* Map */}
        <div className="lg:col-span-5 h-[420px] lg:h-[600px]">
          <PickupPointMap
            points={points}
            selectedId={selectedId}
            onPinClick={handleSelect}
          />
        </div>

        {/* List */}
        <div className="lg:col-span-3 h-[420px] lg:h-[600px]">
          <PickupPointList
            points={points}
            selectedId={selectedId}
            onSelect={handleSelect}
            onAdd={handleAdd}
          />
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-4 lg:h-[600px] lg:overflow-y-auto">
          <PickupPointDetail
            key={selectedId}
            point={selectedPoint}
            onClose={() => setSelectedId(null)}
            onVerify={handleVerify}
            onReject={handleReject}
            onFlag={handleFlag}
            onDeactivate={handleDeactivate}
          />
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground text-center pt-1">
        Verified pickup points are shown on the resident Truck Tracking page · Driver submissions are auto-collected during routes
      </p>
    </div>
  );
};

export default AdminPickupPoints;
