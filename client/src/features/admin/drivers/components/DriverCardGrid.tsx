import { useState, useMemo } from "react";
import {
  Truck,
  Phone,
  Clock,
  MoreHorizontal,
  Mail,
  Users,
} from "lucide-react";
import PaginationControls from "@/components/common/PaginationControls";
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
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm sm:text-base font-display shrink-0 shadow-2xs group-hover:scale-105 group-hover:bg-primary/15 transition-all duration-200">
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
                      <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-border/80 p-1">
                        <DropdownMenuItem onClick={() => onView(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground">
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground">
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground">
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground">
                          {d.status === "Active" ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(d)}
                          className="text-xs cursor-pointer focus:bg-muted focus:text-foreground"
                        >
                          Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 text-xs pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate font-sans tabular-nums">{d.contactNumber}</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{d.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {truck ? (
                      <span className="truncate">
                        {truck.name} · <span className="font-sans tabular-nums">{truck.plateNumber}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic">
                        No truck assigned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">Last login: {d.lastLogin}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={ITEMS_PER_PAGE}
          itemLabel="collectors"
          onPageChange={setCurrentPage}
          variant="floating"
        />
      )}
    </div>
  );
};

export default DriverCardGrid;
