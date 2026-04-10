import { useState } from "react";
import {
  Search, Eye, Edit2, Trash2, Truck as TruckIcon, MoreHorizontal, Wrench, CheckCircle2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Truck, Driver } from "../types";

interface TruckCardGridProps {
  trucks: Truck[];
  drivers: Driver[];
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  onView: (t: Truck) => void;
  onEdit: (t: Truck) => void;
  onToggleStatus: (t: Truck) => void;
  onDelete: (t: Truck) => void;
}

const TruckCardGrid = ({
  trucks, drivers, search, onSearch, statusFilter, onStatusFilter,
  onView, onEdit, onToggleStatus, onDelete,
}: TruckCardGridProps) => {
  const getDriver = (driverId: string | null) => drivers.find(d => d.id === driverId);

  const filtered = trucks.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.plateNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or plate..." value={search} onChange={e => onSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trucks</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 col-span-full text-center">No trucks found.</p>
        ) : filtered.map(t => {
          const driver = getDriver(t.assignedDriverId);
          return (
            <div
              key={t.id}
              className="bg-card border border-border rounded-xl p-5 space-y-4 group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onView(t)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TruckIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.model}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onView(t)}><Eye className="w-3.5 h-3.5 mr-2" /> View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(t)}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(t)}>
                      {t.status === "Active"
                        ? <><Wrench className="w-3.5 h-3.5 mr-2" /> Mark Under Maintenance</>
                        : <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Mark as Active</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(t)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><TruckIcon className="w-3.5 h-3.5" /> {t.plateNumber}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  {driver ? driver.fullName : <span className="text-muted-foreground/50">Unassigned</span>}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-xs">♻️</span> {t.wasteType}
                </div>
              </div>
              <Badge variant="outline" className={t.status === "Active"
                ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }>{t.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TruckCardGrid;
