import ListEmptyState from "@/components/common/ListEmptyState";
import { useState, useMemo, useEffect } from "react";
import {
  Truck,
  Phone,
  Clock,
  MoreHorizontal,
  Mail,
  Users,
  Eye,
  SquarePen,
  KeyRound,
  UserCheck,
  Trash2,
} from "lucide-react";
import PaginationControls from "@/components/common/PaginationControls";
import { profileAvatarForAccount, profileAvatarImageSrc } from "@/components/common/profileAvatars";
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
import { adminCollectorManagerStyles as styles } from "@/components/common/communityContentStyles";
import { cn } from "@/lib/utils";

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, assignmentFilter]);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (visiblePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, visiblePage]);

  return (
    <div className="space-y-5">

      {/* ── Cards Grid ── */}
      {paginated.length === 0 ? (
        <ListEmptyState icon={Users} title="No Collectors Found"
          description={search || statusFilter !== "all"
                ? "No collectors match your search query or status filter."
                : "No collector personnel registered yet."} />
      ) : (
        <div className={styles.grid}>
          {paginated.map((d) => {
            const truck = getTruck(d.truckId);
            return (
              <div
                key={d.id}
                onClick={() => onView(d)}
                className={cn(styles.card, "hover:border-primary/40 transition-all duration-200 cursor-pointer group")}
              >
                {/* Header Row */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardIdentity}>
                    <div className="w-11 h-11 overflow-hidden rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-sm sm:text-base font-body shrink-0 shadow-2xs group-hover:bg-primary/15 transition-all duration-200">
                      <img src={profileAvatarImageSrc(profileAvatarForAccount(d.userId, d.avatarUrl))} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover object-center" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold font-body text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                        {d.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{d.username}
                      </p>
                    </div>
                  </div>

                  <div className={styles.cardControls} onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${
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
                          aria-label={`Actions for ${d.fullName}`}
                          className="h-8 w-8 rounded-lg cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-border/80 p-1">
                        <DropdownMenuItem onClick={() => onView(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground gap-2">
                          <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground gap-2">
                          <SquarePen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground gap-2">
                          <KeyRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Reset Password
                        </DropdownMenuItem>
                        {d.status === "Deactivated" && <DropdownMenuItem onClick={() => onToggleStatus(d)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground gap-2">
                          <UserCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Reactivate
                        </DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(d)}
                          className="text-xs cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
                        >
                          <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
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
                        No Truck Assigned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">Last Login: {d.lastLogin}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <PaginationControls mobileLayout="summary"
          currentPage={visiblePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          variant="floating"
        />
      )}
    </div>
  );
};

export default DriverCardGrid;
