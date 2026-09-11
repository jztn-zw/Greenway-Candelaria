import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/common";
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
  Pending:
    "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
  "Under Review":
    "bg-background/95 dark:bg-zinc-900/90 text-sky-700 dark:text-sky-300 border-sky-500/40 dark:border-sky-400/40 backdrop-blur-md shadow-2xs",
  Resolved:
    "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  Dismissed:
    "bg-background/95 dark:bg-zinc-900/90 text-muted-foreground border-border/80 backdrop-blur-md shadow-2xs",
};

const residentStatusStyles: Record<string, string> = {
  Active:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  Deactivated:
    "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30",
  Banned:
    "bg-background/95 dark:bg-zinc-900/90 text-rose-700 dark:text-rose-300 border-rose-500/40 dark:border-rose-400/40 backdrop-blur-md shadow-2xs",
};

interface Props {
  resident: Resident;
  onBack: () => void;
  onToggleStatus?: (resident: Resident) => void;
}

const ResidentProfileView = ({ resident, onBack, onToggleStatus }: Props) => {
  const initials = resident.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Top Navigation & Page Header ── */}
      <div className="space-y-3">
        <BackButton label="Back to Residents" onClick={onBack} />

        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight leading-tight">
            Resident Profile
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed resident verification, account information, and waste report history.
          </p>
        </div>
      </div>

      {/* ── Resident Profile Overview Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg font-display shrink-0 shadow-2xs">
              {initials || "R"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                  {resident.fullName}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${
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
                className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-medium text-xs cursor-pointer active:scale-95 shadow-2xs gap-1.5"
              >
                {resident.status === "Active" ? (
                  <>
                    <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    Reactivate
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
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
              Contact Number
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground font-sans tabular-nums">
              {resident.phone || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
              Email Address
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground truncate" title={resident.email}>
              {resident.email || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
              Barangay
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.barangay ? `Barangay ${resident.barangay}` : "Unassigned"}
            </p>
          </div>

          {/* Layer 2: Activity & Verification */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
              Date Registered
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.dateRegistered || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
              Last Login
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.lastLogin || "Never"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70" />
              Account Status
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {resident.status === "Active" ? "Verified & Active" : "Account Deactivated"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Waste Report History ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold font-display text-foreground tracking-tight">
              Waste Report History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Environmental and collection reports submitted by this resident.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60 tabular-nums self-start sm:self-auto">
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
                          className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${
                            reportStatusStyles[r.status] ||
                            reportStatusStyles.Pending
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
