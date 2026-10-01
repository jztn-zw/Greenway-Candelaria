import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
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
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Clock,
  ShieldCheck,
  UserX,
  UserCheck,
  FileText,
} from "lucide-react";
import type { Resident } from "./types";

const reportStatusStyles: Record<string, string> = {
  Submitted:
    getStatusBadgeStyle("Submitted").className,
  "Under Review":
    getStatusBadgeStyle("Under Review").className,
  Dispatched:
    getStatusBadgeStyle("Dispatched").className,
  Resolved:
    getStatusBadgeStyle("Resolved").className,
};

const residentStatusStyles: Record<string, string> = {
  Active:
    getStatusBadgeStyle("Active").className,
  Deactivated:
    getStatusBadgeStyle("Deactivated").className,
  Banned:
    getStatusBadgeStyle("Banned").className,
};

interface Props {
  resident: Resident;
  onToggleStatus?: (resident: Resident) => void;
}

const ResidentProfileView = ({ resident, onToggleStatus }: Props) => {
  const initials = resident.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="gw-heading text-xl sm:text-2xl text-foreground tracking-tight leading-tight">
          Resident Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Detailed resident verification, account information, and waste report history.
        </p>
      </div>

      {/* ── Resident Profile Overview Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-lg font-body shrink-0 shadow-2xs">
              {initials || "R"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="gw-heading text-xl sm:text-2xl text-foreground tracking-tight">
                  {resident.fullName}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${
                    residentStatusStyles[resident.status] ||
                    residentStatusStyles.Active
                  }`}
                >
                  {resident.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{resident.username}
              </p>
            </div>
          </div>

          {onToggleStatus && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(resident)}
                className="h-9 px-3.5 rounded-xl font-medium text-xs cursor-pointer shadow-2xs gap-1.5"
              >
                {resident.status === "Active" ? (
                  <>
                    <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    {resident.status === "Banned" ? "Unban" : "Reactivate"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Structured Information Grid (2 Layers, Typography-Driven) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6 pt-6 border-t border-border/60">
          {/* Layer 1: Contact & Location */}
          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
              Contact Number
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground font-sans tabular-nums">
              {resident.phone || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
              Email Address
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground truncate" title={resident.email}>
              {resident.email || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
              Barangay
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.barangay === "Unassigned" ? "Unassigned" : `Barangay ${resident.barangay}`}
            </p>
          </div>

          {/* Layer 2: Activity & Verification */}
          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
              Date Registered
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.dateRegistered || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
              Last Login
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.lastLogin || "Never"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70" />
              Account Status
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.status === "Active" ? "Account Active" : resident.status === "Banned" ? "Account Banned" : "Account Deactivated"}
            </p>
            {resident.status === "Banned" && resident.banReason ? (
              <p className="text-xs text-muted-foreground">Reason: {resident.banReason}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Waste Report History ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="gw-heading text-lg text-foreground tracking-tight">
              Waste Report History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Environmental and collection reports submitted by this resident.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/60 tabular-nums self-start sm:self-auto">
            {resident.reports.length} {resident.reports.length === 1 ? "report" : "reports"}
          </span>
        </div>

        {resident.reports.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground border border-border flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No reports submitted yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              This resident has not submitted any waste collection or violation reports yet.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                      Reference No.
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                      Category
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                      Date Submitted
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resident.reports.map((r) => (
                    <TableRow key={r.referenceNumber} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-sans tabular-nums font-semibold text-foreground">
                        {r.referenceNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {r.violationType}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-sans tabular-nums">
                        {r.dateSubmitted}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-ui-caption font-semibold rounded-md px-2.5 py-0.5 ${
                            reportStatusStyles[r.status] ||
                            reportStatusStyles.Submitted
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentProfileView;
