import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  AlertOctagon,
  Camera,
  EyeOff,
  MapPin,
} from "lucide-react";
import PaginationControls from "@/components/common/PaginationControls";
import { WasteReportRowsSkeleton } from "@/components/PageLoadingSkeletons";
import {
  WasteReport,
  statusBadgeStyles,
  violationBadgeStyles,
  safeFormatDate,
} from "./types";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface ReportListTableProps {
  reports: WasteReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onQuickStatusChange?: (id: string, newStatus: string) => void;
  onFlagReport?: (id: string, payload: { is_false?: boolean; is_duplicate?: boolean }) => void;
}

const ReportListTable = ({
  reports,
  selectedId,
  onSelect,
  isLoading = false,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  onQuickStatusChange,
  onFlagReport,
}: ReportListTableProps) => {
  const handleCopyRef = (e: React.MouseEvent, refNumber: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refNumber);
    toast.success(`Reference ${refNumber} copied`);
  };

  return (
    <div aria-busy={isLoading} className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
      {isLoading && <span role="status" className="sr-only">Loading reports…</span>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/80 bg-muted/30">
              <TableHead className="text-xs font-semibold py-3.5">
                Reference
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5">
                Violation Type
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5">
                Location
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5">
                Date Filed
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5 text-center">
                Photos
              </TableHead>
              <TableHead className="text-xs font-semibold py-3.5">
                Status
              </TableHead>
              <TableHead className="text-right pr-4 py-3.5 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <WasteReportRowsSkeleton />
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No Waste Reports Found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    No reports match this status filter. Try selecting another tab or resetting filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const isSelected = selectedId === report.id;
                const sc = statusBadgeStyles[report.status] || statusBadgeStyles.Submitted;
                const vc = violationBadgeStyles[report.violationType] || violationBadgeStyles.Other;

                return (
                  <TableRow
                    key={report.id}
                    onClick={() => onSelect(report.id)}
                    aria-selected={isSelected}
                    className={cn(
                      "cursor-pointer transition-all duration-150 border-b border-border/60 group",
                      isSelected
                        ? "bg-primary/10 border-l-2 border-l-primary font-medium"
                        : "hover:bg-muted/40",
                    )}
                  >
                  {/* Reference Number */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        onClick={(e) => handleCopyRef(e, report.referenceNumber)}
                        className="text-xs font-sans tabular-nums font-semibold text-foreground hover:text-primary transition-colors cursor-copy"
                        title="Click to copy reference"
                      >
                        {report.referenceNumber}
                      </span>
                    </div>
                  </TableCell>

                  {/* Violation Type */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center text-ui-caption font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${vc}`}
                    >
                      {report.violationType}
                    </Badge>
                  </TableCell>

                  {/* Location */}
                  <TableCell className="py-3">
                    <div>
                      <span className="text-xs font-semibold text-foreground">
                        {report.barangay}
                      </span>
                      {report.street && (
                        <p className="text-ui-caption text-muted-foreground truncate max-w-[160px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {report.street}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="py-3">
                    <span className="text-xs text-muted-foreground">
                      {safeFormatDate(report.submittedAt)}
                    </span>
                  </TableCell>

                  {/* Photos */}
                  <TableCell className="py-3 text-center">
                    {report.photos?.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-ui-caption font-semibold bg-muted/60 border border-border/60 text-muted-foreground">
                        <Camera className="w-3 h-3 text-muted-foreground" />
                        <span>{report.photos.length}</span>
                      </span>
                    ) : (
                      <span className="text-ui-caption text-muted-foreground/60">—</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${sc.badge}`}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="text-right pr-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl border border-border/80 p-1 shadow-md">
                        <DropdownMenuItem
                          onClick={() => onSelect(report.id)}
                          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
                        >
                          Inspect Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleCopyRef(e, report.referenceNumber)}
                          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
                        >
                          Copy Reference
                        </DropdownMenuItem>

                        {onQuickStatusChange && report.status !== "Resolved" && (
                          <>
                            <DropdownMenuSeparator className="my-1" />
                            {report.status === "Submitted" && (
                              <DropdownMenuItem
                                onClick={() => onQuickStatusChange(report.id, "UNDER_REVIEW")}
                                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
                              >
                                Move to Review
                              </DropdownMenuItem>
                            )}
                            {report.status === "Under Review" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => onQuickStatusChange(report.id, "DISPATCHED")}
                                  className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
                                >
                                  Move to Dispatched
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onQuickStatusChange(report.id, "RESOLVED")}
                                  className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
                                >
                                  Mark Resolved
                                </DropdownMenuItem>
                              </>
                            )}
                            {report.status === "Dispatched" && (
                              <DropdownMenuItem
                                onClick={() => onQuickStatusChange(report.id, "RESOLVED")}
                                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
                              >
                                Mark Resolved
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            }))}
          </TableBody>
        </Table>
      </div>

      {/* ── Table Pagination Bar ── */}
      {totalPages > 1 && onPageChange && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={10}
          itemLabel="reports"
          onPageChange={onPageChange}
          variant="table"
        />
      )}
    </div>
  );
};

export default ReportListTable;
