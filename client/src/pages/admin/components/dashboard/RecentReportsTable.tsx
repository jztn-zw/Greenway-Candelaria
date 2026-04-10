import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

interface Report {
  ref: string;
  type: string;
  barangay: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "Under Review" | "Dispatched" | "Resolved";
  reporter: string;
}

const reports: Report[] = [
  { ref: "WR-2024-0047", type: "Illegal Dumping", barangay: "Brgy. Poblacion", date: "Mar 30, 2026", priority: "High", status: "Pending", reporter: "Juan D." },
  { ref: "WR-2024-0046", type: "Missed Collection", barangay: "Brgy. Malabanban Norte", date: "Mar 29, 2026", priority: "Medium", status: "Under Review", reporter: "Anonymous" },
  { ref: "WR-2024-0045", type: "Overflowing Bin", barangay: "Brgy. Kinatihan I", date: "Mar 29, 2026", priority: "Low", status: "Dispatched", reporter: "Maria S." },
  { ref: "WR-2024-0044", type: "Illegal Dumping", barangay: "Brgy. Pahinga Norte", date: "Mar 28, 2026", priority: "High", status: "Resolved", reporter: "Pedro R." },
  { ref: "WR-2024-0043", type: "Clogged Drain", barangay: "Brgy. Poblacion", date: "Mar 28, 2026", priority: "Medium", status: "Pending", reporter: "Anonymous" },
];

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Under Review": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Dispatched: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Resolved: "bg-primary/10 text-primary border-primary/20",
};

const priorityColors: Record<string, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Low: "bg-muted text-muted-foreground",
};

const RecentReportsTable = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold">Recent Reports</CardTitle>
        <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0 gap-1">
          <FileText className="w-3 h-3" /> View All Reports
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-wider">Ref</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Barangay</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Priority</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.ref}>
                <TableCell className="text-xs font-mono font-medium">{r.ref}</TableCell>
                <TableCell className="text-xs">{r.type}</TableCell>
                <TableCell className="text-xs">{r.barangay}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${priorityColors[r.priority]}`}>{r.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[r.status]}`}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default RecentReportsTable;
