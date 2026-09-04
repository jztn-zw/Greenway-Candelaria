import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Truck } from "./types";

interface MissedCollectionButtonProps {
  truck: Truck;
}

const MissedCollectionButton = ({ truck }: MissedCollectionButtonProps) => {
  const navigate = useNavigate();

  if (!truck.isResidentTruck || truck.status !== "done") return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 text-xs gap-2 rounded-xl transition-all"
      onClick={(e) => {
        e.stopPropagation();
        navigate("/resident/report", { state: { type: "missed-collection", truckId: truck.id } });
      }}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      Report Missed Collection
    </Button>
  );
};

export default MissedCollectionButton;
