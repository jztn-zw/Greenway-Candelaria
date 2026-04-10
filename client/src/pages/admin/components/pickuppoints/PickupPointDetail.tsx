import { useState } from "react";
import { X, MapPin, CheckCircle2, XCircle, AlertTriangle, Flag, Power, Pencil, Truck, User, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import type { PickupPoint } from "./types";
import { BARANGAY_LIST } from "./mockData";
import { toast } from "sonner";

interface PickupPointDetailProps {
  point: PickupPoint | null;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onFlag: (id: string) => void;
  onDeactivate: (id: string) => void;
}

const PickupPointDetail = ({ point, onClose, onVerify, onReject, onFlag, onDeactivate }: PickupPointDetailProps) => {
  const [label, setLabel] = useState(point?.label || "");
  const [barangay, setBarangay] = useState(point?.barangay || "");
  const [radius, setRadius] = useState(point?.coverageRadius || 100);
  const [notes, setNotes] = useState(point?.notes || "");
  const [editing, setEditing] = useState(false);

  if (!point) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-primary/40" />
        </div>
        <p className="text-sm font-display font-semibold text-foreground">Select a pickup point</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Click on a pin on the map or a point from the list to view its details.
        </p>
      </div>
    );
  }

  const isPending = point.status === "pending";
  const isVerified = point.status === "verified";
  const sourceLabel = point.source === "driver" ? "Driver Submission" : point.source === "resident" ? "Resident Suggestion" : "Manual Entry";
  const SourceIcon = point.source === "driver" ? Truck : point.source === "resident" ? User : Pencil;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            point.flagged ? "bg-destructive/10" : isPending ? "bg-amber-500/10" : "bg-primary/10"
          }`}>
            {point.flagged ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <MapPin className={`w-4 h-4 ${isPending ? "text-amber-600" : "text-primary"}`} />
            )}
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-foreground">
              {isPending ? "Review Submission" : "Point Details"}
            </p>
            <p className="text-[10px] text-muted-foreground">{point.id.toUpperCase()}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Coordinates preview */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">GPS Coordinates</span>
          </div>
          <p className="text-sm font-mono text-foreground tabular-nums">
            {point.coords[0].toFixed(6)}, {point.coords[1].toFixed(6)}
          </p>
        </div>

        {/* Source info */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <SourceIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">{sourceLabel}</p>
            <p className="text-[11px] text-muted-foreground">
              by {point.submittedBy} · {new Date(point.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${
            isPending ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
            isVerified ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
            "bg-muted text-muted-foreground"
          }`}>
            {isPending ? "⏳ Pending Review" : isVerified ? "✓ Verified" : point.status}
          </Badge>
          {point.flagged && (
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
              ⚠ Flagged
            </Badge>
          )}
          {point.verifiedAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Verified {new Date(point.verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {/* Flag reason */}
        {point.flagged && point.flagReason && (
          <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3">
            <p className="text-xs text-destructive font-medium">⚠ Flag Reason</p>
            <p className="text-xs text-foreground mt-1">{point.flagReason}</p>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Near Brgy. Hall"
              disabled={isVerified && !editing}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Barangay
            </label>
            <select
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              disabled={isVerified && !editing}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            >
              {BARANGAY_LIST.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Coverage Radius: {radius}m
            </label>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={50}
              max={500}
              step={10}
              disabled={isVerified && !editing}
              className="mt-2"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">50m</span>
              <span className="text-[10px] text-muted-foreground">500m</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              disabled={isVerified && !editing}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          {isPending && (
            <>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  onVerify(point.id);
                  toast.success("Pickup point verified", { description: "Now visible on resident Truck Tracking page." });
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify & Publish
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={() => {
                  onReject(point.id);
                  toast.info("Submission rejected", { description: "The submitter will be notified." });
                }}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </>
          )}

          {isVerified && !editing && (
            <>
              <Button variant="outline" className="w-full gap-2" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" />
                Edit Point
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs text-amber-600 hover:text-amber-600 hover:bg-amber-500/5"
                  onClick={() => {
                    onFlag(point.id);
                    toast.warning("Point flagged as problem area");
                  }}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {point.flagged ? "Unflag" : "Flag"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => {
                    onDeactivate(point.id);
                    toast.info("Point deactivated", { description: "Hidden from driver and resident apps." });
                  }}
                >
                  <Power className="w-3.5 h-3.5" />
                  Deactivate
                </Button>
              </div>
            </>
          )}

          {isVerified && editing && (
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  setEditing(false);
                  toast.success("Changes saved");
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PickupPointDetail;
