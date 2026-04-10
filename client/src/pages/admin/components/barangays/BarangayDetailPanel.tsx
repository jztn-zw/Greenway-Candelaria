import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, Route, FileText, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Pencil, X, Save, Star, Truck, Calendar, MapPin
} from "lucide-react";
import { Barangay, ZoneType } from "./types";
import { zoneList } from "./mockData";
import { toast } from "sonner";

interface BarangayDetailPanelProps {
  barangay: Barangay | null;
  onUpdate: (updated: Barangay) => Promise<boolean>;
}

const statusColors: Record<string, string> = {
  Submitted: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "Under Review": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Dispatched: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  Resolved: "bg-primary/10 text-primary border-primary/20",
};

const BarangayDetailPanel = ({ barangay, onUpdate }: BarangayDetailPanelProps) => {
  const [editing, setEditing] = useState(false);
  const [editZone, setEditZone] = useState<ZoneType>("Urban");
  const [editNotes, setEditNotes] = useState("");

  if (!barangay) {
    return (
      <div className="bg-card border border-border rounded-xl h-full flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <p className="font-display font-semibold text-foreground">Select a Barangay</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">
          Click on any barangay from the list to view its full profile and details.
        </p>
      </div>
    );
  }

  const startEdit = () => {
    setEditZone(barangay.zone);
    setEditNotes(barangay.notes);
    setEditing(true);
  };

  const saveEdit = async () => {
    const ok = await onUpdate({ ...barangay, zone: editZone, notes: editNotes });
    if (!ok) {
      toast.error(`Failed to update ${barangay.name}`);
      return;
    }
    setEditing(false);
    toast.success(`${barangay.name} updated successfully`);
  };

  const togglePriority = async () => {
    const next = !barangay.isPriority;
    const ok = await onUpdate({ ...barangay, isPriority: next });
    if (!ok) {
      toast.error(`Failed to update ${barangay.name}`);
      return;
    }
    toast.success(`${barangay.name} ${next ? "marked as priority" : "priority removed"}`);
  };

  const stats = [
    { label: "Total Reports", value: barangay.totalReports, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Resolved", value: barangay.resolvedReports, icon: CheckCircle2, color: "text-[hsl(var(--leaf))]", bg: "bg-[hsl(var(--leaf))]/10" },
    { label: "Pending", value: barangay.pendingReports, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Residents", value: barangay.residentCount, icon: Users, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-foreground text-lg leading-tight">{barangay.name}</h2>
                {barangay.isPriority && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  {barangay.zone} Zone
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${barangay.status === "Active" ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                  {barangay.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {editing ? (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
                 <Button size="icon" className="h-8 w-8" onClick={() => void saveEdit()}>
                   <Save className="w-4 h-4" />
                 </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={startEdit}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* Priority toggle */}
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-muted-foreground font-medium">Priority Barangay</span>
           <Switch checked={barangay.isPriority} onCheckedChange={() => void togglePriority()} />
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="p-5 border-b border-border bg-muted/30 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Zone Classification</label>
            <Select value={editZone} onValueChange={(v) => setEditZone(v as ZoneType)}>
              <SelectTrigger className="bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zoneList.map(z => <SelectItem key={z} value={z}>{z} Zone</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Notes</label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add operational notes for this barangay..."
              className="bg-card text-xs min-h-[70px]"
            />
          </div>
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Mini Stats */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Statistics</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {stats.map(s => (
              <div key={s.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm font-bold font-display leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collection Completion */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collection Rate (30d)</h3>
            <span className="text-sm font-bold font-display text-primary">{barangay.collectionCompletionRate}%</span>
          </div>
          <Progress value={barangay.collectionCompletionRate} className="h-2" />
        </div>

        <Separator />

        {/* Waste Schedule */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> Waste Schedule
          </h3>
          <div className="space-y-1.5">
            {barangay.wasteSchedule.map((ws, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-md bg-muted/30">
                <span className="text-muted-foreground">{ws.day}</span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{ws.wasteType}</Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Assigned Routes */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Route className="w-3 h-3" /> Assigned Routes
          </h3>
          <div className="space-y-2">
            {barangay.assignedRoutes.map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">{r.routeName}</span>
                  <Badge variant="outline" className="text-[10px]">{r.days.join(", ")}</Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{r.truckName}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.driverName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Recent Reports */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Recent Reports
          </h3>
          <div className="space-y-1.5">
            {barangay.recentReports.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-2.5 rounded-md hover:bg-muted/40 transition-colors">
                <div>
                  <span className="text-xs font-mono font-semibold text-foreground">{r.referenceNumber}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{r.violationType}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusColors[r.status] || ""}`}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {barangay.notes && !editing && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{barangay.notes}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BarangayDetailPanel;
