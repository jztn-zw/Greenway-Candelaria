import { Truck, MapPin, Clock, Play, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AssignmentData } from "./mockData";

interface Props {
  data: AssignmentData;
  onAction: () => void;
}

const AssignmentCard = ({ data, onAction }: Props) => {
  const { routeState, routeName, truckName, plateNumber, totalStops, completedStops, skippedStops, estimatedStart, timeElapsedMinutes } = data;
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
  const hours = Math.floor(timeElapsedMinutes / 60);
  const mins = timeElapsedMinutes % 60;

  if (routeState === "unassigned") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
          <Truck className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-foreground font-semibold font-display">No route assigned for today</p>
        <p className="text-sm text-muted-foreground mt-1">Please contact your supervisor.</p>
      </div>
    );
  }

  if (routeState === "no-schedule") {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
          <Clock className="w-7 h-7 text-primary" />
        </div>
        <p className="text-foreground font-semibold font-display">No collection scheduled today</p>
        <p className="text-sm text-muted-foreground mt-1">Rest up! Next collection day shown below.</p>
      </div>
    );
  }

  const isCompleted = routeState === "completed";
  const isInProgress = routeState === "in-progress";

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${isCompleted ? "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" : "border-border bg-card"}`}>
      {/* Header strip */}
      <div className={`px-5 py-3 flex items-center justify-between ${isCompleted ? "bg-primary/10" : "bg-muted/30"}`}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Today's Assignment</span>
        </div>
        {isInProgress && (
          <span className="text-xs font-mono text-muted-foreground tabular-nums">{hours}h {String(mins).padStart(2, "0")}m elapsed</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Route info */}
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">{routeName}</h3>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />{truckName} · {plateNumber}</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{totalStops} stops</span>
            {!isInProgress && !isCompleted && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Est. {estimatedStart}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress bar for in-progress */}
        {isInProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{completedStops} of {totalStops} stops completed</span>
              <span className="font-semibold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
        )}

        {/* Completion summary */}
        {isCompleted && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Completed", value: completedStops },
              { label: "Skipped", value: skippedStops },
              { label: "Time on Route", value: `${hours}h ${mins}m` },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-background/60">
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={onAction}
          className={`w-full h-12 text-sm font-semibold rounded-xl ${
            isCompleted
              ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              : isInProgress
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
          variant={isCompleted ? "outline" : "default"}
        >
          {isCompleted ? (
            <><Eye className="w-4 h-4 mr-2" />View Summary</>
          ) : isInProgress ? (
            <><ArrowRight className="w-4 h-4 mr-2" />Continue Route</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Start Route</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AssignmentCard;
