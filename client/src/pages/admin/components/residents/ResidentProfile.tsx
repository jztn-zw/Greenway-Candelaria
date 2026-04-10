import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Resident } from "./mockData";

const reportStatusColors: Record<string, string> = {
  Pending: "bg-[hsl(var(--earth))]/60 text-[hsl(var(--earth-dark))]",
  "Under Review": "bg-primary/10 text-primary",
  Resolved: "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))]",
  Dismissed: "bg-muted text-muted-foreground",
};

interface Props {
  resident: Resident;
  onBack: () => void;
}

const ResidentProfileView = ({ resident, onBack }: Props) => (
  <div className="w-full max-w-[1600px] mx-auto space-y-6">
    <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
      <ArrowLeft className="w-4 h-4" /> Back to Residents
    </Button>

    {/* Profile Card */}
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
          {resident.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold font-display">{resident.fullName}</h2>
            <Badge className={resident.status === "Active" ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
              {resident.status}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">@{resident.username}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> {resident.email}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> {resident.phone}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" /> {resident.barangay}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" /> Registered {resident.dateRegistered}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> Last login {resident.lastLogin}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {resident.twoFactorEnabled ? <ShieldCheck className="w-3.5 h-3.5 text-primary" /> : <ShieldOff className="w-3.5 h-3.5" />}
              2FA {resident.twoFactorEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Report History */}
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">Report History</h3>
        <span className="text-sm text-muted-foreground">{resident.reports.length} total reports</span>
      </div>
      {resident.reports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No reports submitted yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Violation Type</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resident.reports.map((r) => (
                <TableRow key={r.referenceNumber}>
                  <TableCell className="font-mono text-xs">{r.referenceNumber}</TableCell>
                  <TableCell>{r.violationType}</TableCell>
                  <TableCell className="text-muted-foreground">{r.dateSubmitted}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={reportStatusColors[r.status]}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  </div>
);

export default ResidentProfileView;
