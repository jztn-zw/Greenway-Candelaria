import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldOff,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/common";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  Deactivated:
    "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
  Banned:
    "bg-background/95 dark:bg-zinc-900/90 text-rose-700 dark:text-rose-300 border-rose-500/40 dark:border-rose-400/40 backdrop-blur-md shadow-2xs",
};

interface Props {
  resident: Resident;
  onBack: () => void;
}

const ResidentProfileView = ({ resident, onBack }: Props) => {
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

      {/* ── Resident Profile Bento Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar Initials */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl font-display shrink-0 shadow-xs">
            {initials || <User className="w-8 h-8" />}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                {resident.fullName}
              </h2>
              <Badge
                variant="outline"
                className={`text-xs font-semibold rounded-full px-3 py-0.5 ${
                  residentStatusStyles[resident.status] ||
                  residentStatusStyles.Active
                }`}
              >
                {resident.status}
              </Badge>
            </div>

            {/* Structured Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  @{resident.username}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground truncate">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate text-foreground font-medium">
                  {resident.email}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground font-medium">
                  {resident.phone}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground font-medium">
                  Barangay {resident.barangay}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  Registered on{" "}
                  <strong className="text-foreground font-semibold">
                    {resident.dateRegistered}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  Last login:{" "}
                  <strong className="text-foreground font-semibold">
                    {resident.lastLogin}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground">
                {resident.twoFactorEnabled ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span>
                  Two-Factor:{" "}
                  <strong className="text-foreground font-semibold">
                    {resident.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Report History Section ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold font-display text-foreground tracking-tight">
              Waste Report History
            </h3>
            <p className="text-xs text-muted-foreground">
              Official waste and environmental reports submitted by this resident.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/60 tabular-nums">
            {resident.reports.length} report{resident.reports.length !== 1 ? "s" : ""}
          </span>
        </div>

        {resident.reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center space-y-2 bg-muted/10">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No Reports Submitted
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              This resident has not submitted any waste collection or violation reports yet.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border/80">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                      Reference No.
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                      Violation / Category
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
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {r.referenceNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {r.violationType}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
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
