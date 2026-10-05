import ListEmptyState from "@/components/common/ListEmptyState";
import { Badge } from "@/components/ui/badge";
import { adminWasteReportStyles as styles } from "@/components/communityContentStyles";
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
  CalendarDays,
  Eye,
  Copy,
  ClipboardCheck,
  Truck,
  CheckCircle2,
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
    <div aria-busy={isLoading} className={styles.list}>
      {isLoading && <span role="status" className="sr-only">Loading reports…</span>}
      <div className="overflow-x-auto">
        <Table className={styles.table}>
          <TableHeader>
            <TableRow className="border-b border-border/80 bg-muted/30">
              <TableHead className="text-xs font-semibold py-3.5">
                <span className="waste-report-wide-label">Reference</span><span className="waste-report-compact-label">Report</span>
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
                <TableCell colSpan={7} className="!p-0">
                  <ListEmptyState variant="inline" icon={AlertOctagon} title="No Waste Reports Found"
                    description="No reports match this status filter. Try selecting another tab or resetting filters." />
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
                    <div className={styles.rowHeading}>
                      <button
                        type="button"
                        onClick={(e) => handleCopyRef(e, report.referenceNumber)}
                        className="break-all text-left text-xs font-sans tabular-nums font-semibold text-foreground hover:text-primary transition-colors cursor-copy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        title="Click to copy reference"
                      >
                        {report.referenceNumber}
                      </button>
                      <Badge variant="outline" className={`${styles.mobileStatus} ${styles.statusBadge} whitespace-nowrap ${sc.badge}`}>
                        {report.status}
                      </Badge>
                    </div>
                    <div className={styles.compact}>
                      <button type="button" className={styles.compactTitle}>{report.violationType}</button>
                      <p className={styles.location}><MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span className="min-w-0 break-words">{report.barangay}{report.street ? ` · ${report.street}` : ""}</span></p>
                    </div>
                    <div className={styles.tabletMetadata}>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="waste-report-date-icon size-3.5 shrink-0" />{safeFormatDate(report.submittedAt)}</span>
                      {report.photos?.length > 0 && <span className="waste-report-photo-count ml-2 inline-flex items-center gap-1.5"><Camera aria-hidden="true" className="size-3.5 shrink-0" />{report.photos.length}<span className={styles.mobilePhotoLabel}>{report.photos.length === 1 ? "photo" : "photos"}</span></span>}
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
                      <button type="button" className="break-words text-left text-xs font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                        {report.barangay}
                      </button>
                      {report.street && (
                        <p className="text-ui-caption text-muted-foreground flex items-start gap-1 break-words">
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
                      className={`${styles.statusBadge} ${sc.badge}`}
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
                          aria-label={`Actions for ${report.referenceNumber}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl border border-border/80 p-1 shadow-md">
                        <DropdownMenuItem
                          onClick={() => onSelect(report.id)}
                          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
                        >
                          <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Inspect Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleCopyRef(e, report.referenceNumber)}
                          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
                        >
                          <Copy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Copy Reference
                        </DropdownMenuItem>

                        {onQuickStatusChange && report.status !== "Resolved" && (
                          <>
                            <DropdownMenuSeparator className="my-1" />
                            {report.status === "Submitted" && (
                              <DropdownMenuItem
                                onClick={() => onQuickStatusChange(report.id, "UNDER_REVIEW")}
                                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
                              >
                                <ClipboardCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                Move to Review
                              </DropdownMenuItem>
                            )}
                            {report.status === "Under Review" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => onQuickStatusChange(report.id, "DISPATCHED")}
                                  className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
                                >
                                  <Truck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                  Move to Dispatched
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onQuickStatusChange(report.id, "RESOLVED")}
                                  className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
                                >
                                  <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                  Mark Resolved
                                </DropdownMenuItem>
                              </>
                            )}
                            {report.status === "Dispatched" && (
                              <DropdownMenuItem
                                onClick={() => onQuickStatusChange(report.id, "RESOLVED")}
                                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
                              >
                                <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
        <PaginationControls mobileLayout="summary"
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          variant="table"
        />
      )}
    </div>
  );
};

export default ReportListTable;
