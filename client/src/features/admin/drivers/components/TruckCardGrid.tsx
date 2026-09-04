import { useState, useMemo } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  Truck as TruckIcon,
  MoreHorizontal,
  Wrench,
  CheckCircle2,
  User,
  Recycle,
  ChevronLeft,
  ChevronRight,
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
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                      <TruckIcon className="w-6 h-6" />
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
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => onView(t)} className="gap-2 cursor-pointer text-xs">
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(t)} className="gap-2 cursor-pointer text-xs">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(t)} className="gap-2 cursor-pointer text-xs">
                          {t.status === "Active" ? (
                            <>
                              <Wrench className="w-3.5 h-3.5 text-amber-500" />
                              Under Maintenance
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Mark as Active
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(t)}
                          className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Truck
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 text-xs pt-1 border-t border-border/60">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/60">
                      {t.plateNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <User className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
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
                    <Recycle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t.wasteType}</span>
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

export default TruckCardGrid;
