import { useState } from "react";
import { Bug, Clock3, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BUG_STATUSES, formatBugDate, statusStyles, type BugReport, type BugStatus } from "./mockData";

interface Props {
  report: BugReport;
  onClose: () => void;
  onSave: (status: BugStatus, response: string) => void;
}

const BugReportModal = ({ report, onClose, onSave }: Props) => {
  const [status, setStatus] = useState<BugStatus>(report.status);
  const [response, setResponse] = useState(report.response);
  const changed = status !== report.status || response.trim() !== report.response;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl p-0 gap-0 bg-card border-border/80">
        <DialogHeader className="p-5 sm:p-6 border-b border-border/70 text-left">
          <div className="flex items-center gap-2 mb-2 pr-7">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bug className="h-4 w-4" /></span>
            <span className="text-xs font-mono text-muted-foreground">{report.id}</span>
            <Badge variant="outline" className={statusStyles[report.status]}>{report.status}</Badge>
          </div>
          <DialogTitle className="font-display text-xl font-bold leading-snug pr-5">{report.title}</DialogTitle>
          <DialogDescription className="text-xs">Submitted {formatBugDate(report.submittedAt)} · {report.category}</DialogDescription>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-muted/30 border border-border/60 p-4 text-xs">
            {[
              ["Reported by", `${report.reporter} · ${report.role}`], ["Email", report.email],
              ["Application", `${report.app} · v${report.version}`], ["Device", report.device],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground mb-1">{label}</dt><dd className="font-medium text-foreground break-words">{value}</dd></div>)}
          </dl>

          <section><h3 className="text-sm font-bold mb-2">Issue description</h3><p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p></section>
          <section><h3 className="text-sm font-bold mb-2">Steps to reproduce</h3><ol className="list-decimal pl-5 space-y-1.5 text-xs text-muted-foreground">{report.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
          <section><h3 className="text-sm font-bold mb-2">Attachments</h3><div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground"><ImageOff className="h-4 w-4 shrink-0" />No screenshots attached to this report.</div></section>

          <section className="space-y-3 border-t border-border/70 pt-5">
            <h3 className="text-sm font-bold">Admin response</h3>
            <div className="space-y-1.5">
              <Label htmlFor="bug-status" className="text-xs">Report status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as BugStatus)}>
                <SelectTrigger id="bug-status" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{BUG_STATUSES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bug-response" className="text-xs">Response to reporter <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="bug-response" value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} placeholder="Add an update or explain how the issue was resolved…" className="min-h-24 rounded-xl resize-y" />
              <p className="text-[11px] text-muted-foreground">Demo only. Changes stay on this page; no notification is sent.</p>
            </div>
          </section>

          <section aria-label="Status history">
            <h3 className="flex items-center gap-2 text-sm font-bold mb-3"><Clock3 className="h-4 w-4 text-muted-foreground" />Status history</h3>
            <ol className="border-l border-border ml-1.5 space-y-3 pl-4">{report.history.map((entry, index) => <li key={`${entry.at}-${index}`} className="text-xs"><p className="font-medium">{entry.status}</p><p className="text-muted-foreground mt-0.5">{entry.by} · {formatBugDate(entry.at)}</p></li>)}</ol>
          </section>
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border/70 bg-card p-4 sm:px-6">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
          <Button className="rounded-xl" disabled={!changed} onClick={() => onSave(status, response.trim())}>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BugReportModal;
