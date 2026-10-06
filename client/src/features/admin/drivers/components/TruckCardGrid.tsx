import ListEmptyState from "@/components/common/ListEmptyState";
import { useState, useMemo, useEffect } from "react";
import {
  Truck as TruckIcon,
  MoreHorizontal,
  Eye,
  SquarePen,
  Wrench,
  CheckCircle2,
  Trash2,
  User,
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
import { Truck, Driver, truckStatusStyles } from "../types";
import { adminCollectorManagerStyles as styles } from "@/components/common/communityContentStyles";
import { cn } from "@/lib/utils";

interface TruckCardGridProps {
  trucks: Truck[];
  drivers: Driver[];
  search: string;
  statusFilter: string;
  driverFilter: "all" | "assigned" | "unassigned";
  onView: (t: Truck) => void;
  onEdit: (t: Truck) => void;
  onToggleStatus: (t: Truck) => void;
  onDelete: (t: Truck) => void;
}

const ITEMS_PER_PAGE = 6;

const TruckCardGrid = ({
  trucks,
  drivers,
  search,
  statusFilter,
  driverFilter,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: TruckCardGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const getDriver = (driverId: string | null) =>
    drivers.find((d) => d.id === driverId);

  const filtered = useMemo(() => {
    return trucks.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.model.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      const matchesDriver =
        driverFilter === "all" ||
        (driverFilter === "assigned" ? Boolean(t.assignedDriverId) : !t.assignedDriverId);
      return matchesSearch && matchesStatus && matchesDriver;
    });
  }, [trucks, search, statusFilter, driverFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, driverFilter]);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (visiblePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, visiblePage]);

  return (
    <div className="space-y-5">

      {/* ── Cards Grid ── */}
      {paginated.length === 0 ? (
        <ListEmptyState icon={TruckIcon} title="No Trucks Found"
          description={search || statusFilter !== "all"
                ? "No trucks match your search query or status filter."
                : "No municipal collection trucks registered yet."} />
      ) : (
        <div className={styles.grid}>
          {paginated.map((t) => {
            const driver = getDriver(t.assignedDriverId);
            return (
              <div
                key={t.id}
                onClick={() => onView(t)}
                className={cn(styles.card, "hover:border-primary/40 transition-all duration-200 cursor-pointer group")}
              >
                {/* Header Row */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardIdentity}>
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-primary/15 transition-all duration-200">
                      <TruckIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold font-body text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.model}
                      </p>
                    </div>
                  </div>

                  <div className={styles.cardControls} onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${
                        truckStatusStyles[t.status] || ""
                      }`}
                    >
                      {t.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${t.name}`}
                          className="h-8 w-8 rounded-lg cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border border-border/80 p-1">
                        <DropdownMenuItem onClick={() => onView(t)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground gap-2">
                          <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(t)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground gap-2">
                          <SquarePen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Edit Truck
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(t)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground whitespace-nowrap gap-2">
                          {t.status === "Active" ? (
                            <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          )}
                          {t.status === "Active" ? "Mark Under Maintenance" : "Mark as Active"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(t)}
                          className="text-xs cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
                        >
                          <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
                          Delete Truck
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 text-xs pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-sans tabular-nums text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-muted/60 text-foreground border border-border/60 shadow-2xs">
                      {t.plateNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {driver ? (
                      <span className="font-medium text-foreground truncate">
                        {driver.fullName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic text-ui-caption">
                        Unassigned
                      </span>
                    )}
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

export default TruckCardGrid;
