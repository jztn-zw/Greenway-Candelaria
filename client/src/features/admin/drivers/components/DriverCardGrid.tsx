import { useState, useMemo } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  KeyRound,
  Truck,
  Phone,
  Clock,
  MoreHorizontal,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Driver, Truck as TruckType, driverStatusStyles } from "../types";

interface DriverCardGridProps {
  drivers: Driver[];
  trucks: TruckType[];
  search: string;
  statusFilter: string;
  assignmentFilter: "all" | "assigned" | "unassigned";
  onView: (d: Driver) => void;
  onEdit: (d: Driver) => void;
  onResetPassword: (d: Driver) => void;
  onToggleStatus: (d: Driver) => void;
  onDelete: (d: Driver) => void;
}

const ITEMS_PER_PAGE = 6;

const getInitials = (name: string): string => {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const DriverCardGrid = ({
  drivers,
  trucks,
  search,
  statusFilter,
  assignmentFilter,
  onView,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: DriverCardGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const getTruck = (truckId: string | null) =>
    trucks.find((t) => t.id === truckId);

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch =
        d.fullName.toLowerCase().includes(search.toLowerCase()) ||
        d.username.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase()) ||
        d.contactNumber.includes(search);
      const matchesStatus =
        statusFilter === "all" || d.status === statusFilter;
      const matchesAssignment =
        assignmentFilter === "all" ||
        (assignmentFilter === "assigned" ? Boolean(d.truckId) : !d.truckId);
      return matchesSearch && matchesStatus && matchesAssignment;
    });
  }, [drivers, search, statusFilter, assignmentFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div className="space-y-5">

      {/* ── Cards Grid ── */}
      {paginated.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-2xs">
          <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No Collectors Found
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {search || statusFilter !== "all"
                ? "No collectors match your search query or status filter."
                : "No collector personnel registered yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {paginated.map((d) => {
            const truck = getTruck(d.truckId);
            return (
              <div
                key={d.id}
                onClick={() => onView(d)}
                className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm sm:text-base font-display shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                      {getInitials(d.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold font-display text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                        {d.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{d.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                        driverStatusStyles[d.status] || ""
                      }`}
                    >
                      {d.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl">
                        <DropdownMenuItem onClick={() => onView(d)} className="gap-2 cursor-pointer text-xs">
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(d)} className="gap-2 cursor-pointer text-xs">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(d)} className="gap-2 cursor-pointer text-xs">
                          <KeyRound className="w-3.5 h-3.5" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(d)} className="gap-2 cursor-pointer text-xs">
                          {d.status === "Active" ? (
                            <>
                              <UserX className="w-3.5 h-3.5 text-rose-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                              Reactivate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(d)}
                          className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 text-xs pt-1 border-t border-border/60">
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                    <span className="truncate">{d.contactNumber}</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                    <span className="truncate">{d.email}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                    {truck ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[11px] border border-primary/20 truncate">
                        {truck.name} · {truck.plateNumber}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic text-[11px]">
                        No truck assigned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground/70 pt-0.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Last login: {d.lastLogin}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Centered Pagination (Matching Posts & Announcements) ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none font-medium"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DriverCardGrid;
