import { useState, useMemo } from "react";
import {
  Truck as TruckIcon,
  MoreHorizontal,
  User,
  Recycle,
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
        t.model.toLowerCase().includes(search.toLowerCase()) ||
        t.wasteType.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      const matchesDriver =
        driverFilter === "all" ||
        (driverFilter === "assigned" ? Boolean(t.assignedDriverId) : !t.assignedDriverId);
      return matchesSearch && matchesStatus && matchesDriver;
    });
  }, [trucks, search, statusFilter, driverFilter]);

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
              <TruckIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No Trucks Found
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {search || statusFilter !== "all"
                ? "No trucks match your search query or status filter."
                : "No municipal collection trucks registered yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {paginated.map((t) => {
            const driver = getDriver(t.assignedDriverId);
            return (
              <div
                key={t.id}
                onClick={() => onView(t)}
                className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 group-hover:bg-primary/15 transition-all duration-200">
                      <TruckIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold font-display text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.model}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border border-border/80 p-1">
                        <DropdownMenuItem onClick={() => onView(t)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground">
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(t)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground">
                          Edit Truck
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(t)} className="text-xs cursor-pointer focus:bg-muted focus:text-foreground whitespace-nowrap">
                          {t.status === "Active" ? "Mark Under Maintenance" : "Mark as Active"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(t)}
                          className="text-xs cursor-pointer focus:bg-muted focus:text-foreground"
                        >
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
                      <span className="text-muted-foreground/60 italic text-[11px]">
                        Unassigned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Recycle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{t.wasteType}</span>
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
          itemLabel="trucks"
          onPageChange={setCurrentPage}
          variant="floating"
        />
      )}
    </div>
  );
};

export default TruckCardGrid;
