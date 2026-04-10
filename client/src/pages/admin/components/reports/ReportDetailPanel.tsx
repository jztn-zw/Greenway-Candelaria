import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText, MapPin, Clock, User, Camera, EyeOff, AlertTriangle, Copy,
  AlertOctagon, Flag, MessageSquare, StickyNote, ChevronRight, Save, UserX
} from "lucide-react";
import { WasteReport, ReportStatus } from "./types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportDetailPanelProps {
  report: WasteReport | null;
}

const statusConfig: Record<string, { class: string; dot: string; bg: string }> = {
  Submitted: { class: "text-amber-700", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  "Under Review": { class: "text-blue-700", dot: "bg-blue-500", bg: "bg-blue-500/10" },
  Dispatched: { class: "text-violet-700", dot: "bg-violet-500", bg: "bg-violet-500/10" },
  Resolved: { class: "text-primary", dot: "bg-primary", bg: "bg-primary/10" },
};

const statusOrder: ReportStatus[] = ["Submitted", "Under Review", "Dispatched", "Resolved"];

const ReportDetailPanel = ({ report }: ReportDetailPanelProps) => {
  const [officialResponse, setOfficialResponse] = useState(report?.officialResponse || "");
  const [internalNote, setInternalNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>(report?.status || "Submitted");

  // Reset state when report changes
  if (report && selectedStatus !== report.status && officialResponse !== (report.officialResponse || "")) {
    // handled by key prop on parent
  }

  if (!report) {
    return (
      <Card className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Select a report</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px]">
          Click on any report from the list to view its full details here
        </p>
      </Card>
    );
  }

  const sc = statusConfig[report.status];

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Report Details</p>
                <h3 className="text-lg font-display font-bold text-foreground mt-1">{report.referenceNumber}</h3>
              </div>
              <Badge variant="outline" className={`gap-1.5 text-xs font-medium ${statusConfig[report.status].class} ${statusConfig[report.status].bg} border-transparent`}>
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                {report.status}
              </Badge>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={AlertTriangle} label="Violation" value={report.violationType} />
              <InfoRow icon={MapPin} label="Barangay" value={report.barangay} />
              {report.street && <InfoRow icon={MapPin} label="Street/Landmark" value={report.street} />}
              <InfoRow icon={Clock} label="Submitted" value={format(new Date(report.submittedAt), "MMM d, yyyy 'at' h:mm a")} />
              <InfoRow
                icon={report.isAnonymous ? EyeOff : User}
                label="Submitter"
                value={report.isAnonymous ? "Anonymous" : report.submitterName}
              />
              <InfoRow icon={Camera} label="Photos" value={`${report.photos.length} attached`} />
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Description</p>
            <p className="text-xs leading-relaxed text-foreground/80">{report.description}</p>
          </div>

          {/* Photo gallery */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Photo Evidence</p>
            <div className="grid grid-cols-3 gap-2">
              {report.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg bg-muted border border-border overflow-hidden group cursor-pointer"
                >
                  <img src={photo.url} alt="Evidence" className="w-full h-full object-cover" />
                  {photo.annotations.length > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-primary/90 text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                      <span className="text-[9px] font-bold">{photo.annotations.length}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status History Timeline */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Status History</p>
            <div className="space-y-0">
              {report.statusHistory.map((entry, idx) => {
                const entryConfig = statusConfig[entry.status];
                return (
                  <div key={entry.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={cn("w-2.5 h-2.5 rounded-full mt-1 ring-2 ring-card", entryConfig.dot)} />
                      {idx < report.statusHistory.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4">
                      <p className={cn("text-xs font-semibold", entryConfig.class)}>{entry.status}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")} • {entry.adminName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Admin Actions */}
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Admin Actions</p>

            {/* Status Update */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <RefreshIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Update Status
              </label>
              <div className="flex gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-xs flex-1 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOrder.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 text-xs px-4"
                  onClick={() => toast.success(`Status updated to ${selectedStatus}`)}
                >
                  Update
                </Button>
              </div>
            </div>

            {/* Official Response */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                Official Response
              </label>
              <Textarea
                placeholder="Write a response visible to the resident..."
                value={officialResponse}
                onChange={(e) => setOfficialResponse(e.target.value)}
                className="text-xs min-h-[80px] bg-card resize-none"
              />
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => toast.success("Response saved")}
              >
                <Save className="w-3 h-3" />
                Save Response
              </Button>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                Internal Notes
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Admin only</Badge>
              </label>
              {report.internalNotes.length > 0 && (
                <div className="space-y-2 mb-2">
                  {report.internalNotes.map((note) => (
                    <div key={note.id} className="bg-muted/50 rounded-lg p-3 border border-border/50">
                      <p className="text-xs text-foreground/80 leading-relaxed">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {note.adminName} • {format(new Date(note.timestamp), "MMM d 'at' h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                placeholder="Add an internal note (not visible to residents)..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                className="text-xs min-h-[60px] bg-card resize-none"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  toast.success("Note added");
                  setInternalNote("");
                }}
              >
                <Save className="w-3 h-3" />
                Save Note
              </Button>
            </div>

            <Separator />

            {/* Flag actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Copy className="w-3 h-3" />
                Flag as Duplicate
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <AlertOctagon className="w-3 h-3" />
                False Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <UserX className="w-3 h-3" />
                Flag Account
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};

// Small helper components
const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  </div>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export default ReportDetailPanel;
