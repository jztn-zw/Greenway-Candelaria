import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  Shield,
  ScrollText,
  ArrowRight,
  User,
  Globe,
  GitCompare,
  ShieldCheck,
  Copy,
} from "lucide-react";
import {
  AuditLogEntry,
  severityStyles,
  moduleBadgeStyles,
  safeFormatDate,
} from "./types";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import PaginationControls from "@/components/common/PaginationControls";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalEntries?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const AuditLogTable = ({
  logs,
  isLoading = false,
  currentPage,
  totalPages = 1,
  totalEntries,
  pageSize = 15,
  onPageChange,
}: AuditLogTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const isDestructiveState = (val?: string) => {
    if (!val) return false;
    const l = val.toLowerCase();
    return (
      l.includes("delet") ||
      l.includes("ban") ||
      l.includes("deactivat") ||
      l.includes("fail")
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
      {/* ── Desktop Table ── */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/80 bg-muted/30">
              <TableHead className="w-10 py-3.5 text-center"></TableHead>
              <TableHead className="text-xs font-semibold py-3.5 whitespace-nowrap">
                Timestamp
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5 whitespace-nowrap">
                Actor / User
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5 whitespace-nowrap">
                Action & Severity
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5 whitespace-nowrap">
                Module
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5 whitespace-nowrap">
                Target Resource
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5 min-w-[280px]">
                Event Summary
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(isLoading && logs.length > 0 && "opacity-60 transition-opacity pointer-events-none")}>
            {isLoading && logs.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/60">
                  <TableCell className="py-4 text-center"><div className="h-4 w-4 mx-auto bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="py-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="py-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="py-4"><div className="h-5 w-24 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell className="py-4"><div className="h-5 w-20 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell className="py-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="py-4"><div className="h-4 w-64 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                    <ScrollText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No Audit Logs Found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    No system audit entries match your current filters or date range. Try clearing your filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const sc = severityStyles[log.severity] || severityStyles.routine;
                const mc = moduleBadgeStyles[log.module] || "bg-muted/60 text-muted-foreground border-border/70 font-medium";
                const isExpanded = expandedId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      onClick={() => toggleExpand(log.id)}
                      className={cn(
                        "cursor-pointer transition-colors border-b border-border/60 group",
                        isExpanded ? "bg-primary/[0.04] border-l-4 border-l-primary" : "hover:bg-muted/40",
                      )}
                    >
                      {/* Expansion Chevron */}
                      <TableCell className="py-3.5 text-center">
                        <div className="w-6 h-6 rounded-lg bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                          )}
                        </div>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <div className="text-xs font-semibold tabular-nums text-foreground">
                          {safeFormatDate(log.timestamp, "MMM d, yyyy")}
                        </div>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {safeFormatDate(log.timestamp, "h:mm a")}
                        </p>
                      </TableCell>

                      {/* Actor / User */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground leading-snug">
                            {log.adminName}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 bg-muted/60 text-muted-foreground border-border/70 font-semibold"
                          >
                            <Shield className="w-2.5 h-2.5 mr-0.5" />
                            {log.adminRole}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Action & Severity */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${sc.badge}`}
                        >
                          {log.actionType}
                        </Badge>
                      </TableCell>

                      {/* Module */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 rounded-full border shadow-2xs ${mc}`}
                        >
                          {log.module}
                        </Badge>
                      </TableCell>

                      {/* Target Record */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={(e) => handleCopy(e, log.affectedRecord, "Record ID")}
                            className="text-xs font-semibold tabular-nums text-foreground bg-muted/50 hover:bg-muted px-2 py-0.5 rounded border border-border/60 transition-colors cursor-copy max-w-[140px] truncate"
                            title="Click to copy record reference"
                          >
                            {log.affectedRecord}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, log.affectedRecord, "Record ID")}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                            title="Copy record"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Event Summary */}
                      <TableCell className="py-3.5">
                        <p className="text-xs text-foreground/85 line-clamp-2 leading-relaxed">
                          {log.summary}
                        </p>
                      </TableCell>
                    </TableRow>

                    {/* ── Expanded Bento Detail Inspector ── */}
                    {isExpanded && (
                      <TableRow className="bg-muted/15 hover:bg-muted/15 border-b border-border/80 animate-in fade-in duration-200">
                        <TableCell colSpan={7} className="py-4 px-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                            {/* Card 1: State Transition & Field Delta */}
                            <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border/80 shadow-2xs space-y-3.5">
                              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                  <GitCompare className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>State Transition & Field Delta</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border/70 font-semibold"
                                >
                                  {log.beforeValue || log.afterValue ? "State Delta" : "Standard Action"}
                                </Badge>
                              </div>

                              {log.beforeValue || log.afterValue ? (
                                <div className="space-y-3 pt-0.5">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {log.beforeValue && (
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                          Previous
                                        </span>
                                        <span className="inline-block px-3 py-1 rounded-xl bg-muted text-muted-foreground text-xs font-medium border border-border/80 tabular-nums">
                                          {log.beforeValue}
                                        </span>
                                      </div>
                                    )}
                                    {log.beforeValue && log.afterValue && (
                                      <div className="pt-4">
                                        <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                                      </div>
                                    )}
                                    {log.afterValue && (
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                          Updated
                                        </span>
                                        <span
                                          className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold border tabular-nums ${
                                            isDestructiveState(log.afterValue)
                                              ? "bg-destructive/10 text-destructive border-destructive/20"
                                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                          }`}
                                        >
                                          {log.afterValue}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                                  No state change delta recorded for this event. This operation was recorded as a direct system action.
                                </p>
                              )}

                              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="text-[11px] uppercase tracking-wider font-bold">Target Resource</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold tabular-nums text-foreground bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
                                    {log.affectedRecord}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopy(e, log.affectedRecord, "Record reference")}
                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer transition-colors"
                                    title="Copy target reference"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Security & Forensic Traceability */}
                            <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Security & Origin Traceability</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                  Tamper-Proof
                                </span>
                              </div>

                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" /> Authenticated Actor
                                  </span>
                                  <span className="font-semibold text-foreground">
                                    {log.adminName}{" "}
                                    <span className="text-muted-foreground font-normal">({log.adminRole})</span>
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                    <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Client IP Address
                                  </span>
                                  <span className="text-xs font-medium tabular-nums text-foreground bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
                                    {log.ipAddress || "Internal Server"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                                  <span className="text-muted-foreground font-medium">
                                    Audit UUID
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-mono text-muted-foreground max-w-[180px] sm:max-w-[220px] truncate">
                                      {log.id}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, log.id, "Audit UUID")}
                                      className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer transition-colors"
                                      title="Copy full Audit UUID"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile Card View ── */}
      <div className="md:hidden divide-y divide-border/60">
        {isLoading && logs.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="h-4 w-28 bg-muted animate-pulse rounded" />
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <ScrollText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground">No Audit Logs Found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adjust your filters or date range to view logs.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const sc = severityStyles[log.severity] || severityStyles.routine;
            const mc = moduleBadgeStyles[log.module] || "bg-muted/60 text-muted-foreground border-border/70 font-medium";
            const isExpanded = expandedId === log.id;

            return (
              <div
                key={log.id}
                onClick={() => toggleExpand(log.id)}
                className={cn(
                  "p-4 transition-colors cursor-pointer",
                  isExpanded ? "bg-primary/[0.04] border-l-4 border-l-primary" : "hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold ${sc.badge}`}
                      >
                        {log.actionType}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${mc}`}
                      >
                        {log.module}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {log.adminName}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {safeFormatDate(log.timestamp, "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 mt-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {!isExpanded && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-2">
                    {log.summary}
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-3 text-xs animate-in fade-in">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                        Target Record
                      </p>
                      <span className="text-xs font-semibold tabular-nums text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                        {log.affectedRecord}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                        Event Summary
                      </p>
                      <p className="text-foreground leading-relaxed">{log.summary}</p>
                    </div>

                    {(log.beforeValue || log.afterValue) && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                          Before → After
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {log.beforeValue && (
                            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-medium border border-border/80">
                              {log.beforeValue}
                            </span>
                          )}
                          {log.beforeValue && log.afterValue && (
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          {log.afterValue && (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                isDestructiveState(log.afterValue)
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {log.afterValue}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/50 text-muted-foreground">
                      <span>IP: {log.ipAddress || "Internal Server"}</span>
                      <span>Role: {log.adminRole}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Table Pagination Bar ── */}
      {totalPages > 1 && onPageChange && currentPage && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalEntries}
          pageSize={pageSize}
          itemLabel="events"
          onPageChange={onPageChange}
          variant="table"
        />
      )}
    </div>
  );
};

export default AuditLogTable;
