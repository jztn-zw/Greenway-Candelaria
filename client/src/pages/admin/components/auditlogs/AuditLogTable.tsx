import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Shield, ScrollText } from "lucide-react";
import { AuditLogEntry, ActionSeverity } from "./types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  currentPage: number;
  pageSize: number;
}

const severityConfig: Record<ActionSeverity, { class: string; dot: string }> = {
  routine: {
    class: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  change: {
    class: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    dot: "bg-amber-500",
  },
  critical: {
    class: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
};

const AuditLogTable = ({ logs, currentPage, pageSize }: AuditLogTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const paginatedLogs = logs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (paginatedLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <ScrollText className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No log entries found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-8"></TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Timestamp
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Admin
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Action
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Module
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Affected Record
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.map((log) => {
              const sc = severityConfig[log.severity];
              const isExpanded = expandedId === log.id;

              return (
                <>
                  <TableRow
                    key={log.id}
                    onClick={() => toggleExpand(log.id)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isExpanded
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <TableCell className="py-3 w-8">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                        {format(new Date(log.timestamp), "MMM d, yyyy")}
                        <br />
                        <span className="text-[10px] opacity-70">
                          {format(new Date(log.timestamp), "hh:mm:ss a")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {log.adminName}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[9px] mt-0.5 px-1.5 py-0 bg-muted/50 text-muted-foreground border-border"
                        >
                          <Shield className="w-2.5 h-2.5 mr-0.5" />
                          {log.adminRole}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium gap-1.5 ${sc.class}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {log.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-muted-foreground">
                        {log.module}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {log.affectedRecord}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                        {log.summary}
                      </span>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${log.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={7} className="py-4 px-6">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                              Full Summary
                            </p>
                            <p className="text-foreground">{log.summary}</p>
                          </div>
                          {log.beforeValue && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                                Before → After
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[11px]">
                                  {log.beforeValue}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px]">
                                  {log.afterValue}
                                </span>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                              IP Address
                            </p>
                            <p className="text-foreground font-mono text-[11px]">
                              {log.ipAddress}
                            </p>
                          </div>
                          {log.metadata &&
                            Object.entries(log.metadata).map(([key, val]) => (
                              <div key={key}>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                                  {key}
                                </p>
                                <p className="text-foreground">{val}</p>
                              </div>
                            ))}
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                              Log ID
                            </p>
                            <p className="text-foreground font-mono text-[11px]">
                              {log.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2 p-3">
        {paginatedLogs.map((log) => {
          const sc = severityConfig[log.severity];
          const isExpanded = expandedId === log.id;

          return (
            <div
              key={log.id}
              onClick={() => toggleExpand(log.id)}
              className={cn(
                "rounded-lg border border-border p-3 cursor-pointer transition-colors",
                isExpanded ? "bg-primary/5 border-primary/20" : "bg-card hover:bg-muted/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-medium gap-1 ${sc.class}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {log.actionType}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {log.module}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {log.adminName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {format(new Date(log.timestamp), "MMM d, yyyy · hh:mm a")}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2.5 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Record
                    </p>
                    <p className="text-foreground font-mono text-[11px]">
                      {log.affectedRecord}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Summary
                    </p>
                    <p className="text-foreground">{log.summary}</p>
                  </div>
                  {log.beforeValue && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Before → After
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[11px]">
                          {log.beforeValue}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px]">
                          {log.afterValue}
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      IP Address
                    </p>
                    <p className="text-foreground font-mono text-[11px]">
                      {log.ipAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default AuditLogTable;
