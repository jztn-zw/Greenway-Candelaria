import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, RefreshCw, Copy, AlertOctagon, FileDown, Camera, EyeOff } from "lucide-react";
import { WasteReport } from "./types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ReportListTableProps {
  reports: WasteReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusConfig: Record<string, { class: string; dot: string }> = {
  Submitted: { class: "bg-amber-500/10 text-amber-700 border-amber-500/20", dot: "bg-amber-500" },
  "Under Review": { class: "bg-blue-500/10 text-blue-700 border-blue-500/20", dot: "bg-blue-500" },
  Dispatched: { class: "bg-violet-500/10 text-violet-700 border-violet-500/20", dot: "bg-violet-500" },
  Resolved: { class: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
};

const priorityConfig: Record<string, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Low: "bg-muted text-muted-foreground border-border",
};

const ReportListTable = ({ reports, selectedId, onSelect }: ReportListTableProps) => {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <AlertOctagon className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No reports found</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Reference</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Violation</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Barangay</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Date</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Photos</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Priority</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const sc = statusConfig[report.status];
            return (
              <TableRow
                key={report.id}
                onClick={() => onSelect(report.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedId === report.id
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-foreground">{report.referenceNumber}</span>
                    {report.isAnonymous && (
                      <EyeOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-xs text-foreground">{report.violationType}</span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-xs text-muted-foreground">{report.barangay}</span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(report.submittedAt), "MMM d, yyyy")}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Camera className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{report.photos.length}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className={`text-[10px] font-medium ${priorityConfig[report.priority]}`}>
                    {report.priority}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className={`text-[10px] font-medium gap-1.5 ${sc.class}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onSelect(report.id)} className="text-xs gap-2">
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Update Status
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs gap-2">
                        <Copy className="w-3.5 h-3.5" /> Flag as Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 text-destructive">
                        <AlertOctagon className="w-3.5 h-3.5" /> Flag as False Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs gap-2">
                        <FileDown className="w-3.5 h-3.5" /> Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReportListTable;
