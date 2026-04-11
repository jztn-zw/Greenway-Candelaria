import { useState } from "react";
import {
  Search, Plus, Eye, Edit2, Trash2, UserX, UserCheck, KeyRound,
  Truck, Phone, Clock, MoreHorizontal, Mail,
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
import type { Driver, Truck as TruckType } from "../types";

interface DriverCardGridProps {
  drivers: Driver[];
  trucks: TruckType[];
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  onView: (d: Driver) => void;
  onEdit: (d: Driver) => void;
  onResetPassword: (d: Driver) => void;
  onToggleStatus: (d: Driver) => void;
  onDelete: (d: Driver) => void;
}

const DriverCardGrid = ({
  drivers, trucks, search, onSearch, statusFilter, onStatusFilter,
  onView, onEdit, onResetPassword, onToggleStatus, onDelete,
}: DriverCardGridProps) => {
  const getTruck = (truckId: string | null) => trucks.find(t => t.id === truckId);

  const filtered = drivers.filter(d => {
    const matchesSearch =
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.username.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or username..." value={search} onChange={e => onSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collectors</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 col-span-full text-center">No collectors found.</p>
        ) : filtered.map(d => {
          const truck = getTruck(d.truckId);
          return (
            <div
              key={d.id}
              className="bg-card border border-border rounded-xl p-5 space-y-4 group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onView(d)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{d.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{d.username}</p>
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
                    <DropdownMenuItem onClick={() => onView(d)}><Eye className="w-3.5 h-3.5 mr-2" /> View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(d)}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onResetPassword(d)}><KeyRound className="w-3.5 h-3.5 mr-2" /> Reset Password</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(d)}>
                      {d.status === "Active" ? <><UserX className="w-3.5 h-3.5 mr-2" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5 mr-2" /> Reactivate</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(d)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {d.contactNumber}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {d.email}</div>
                {truck ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Truck className="w-3.5 h-3.5" /> {truck.name} — {truck.model} · {truck.plateNumber}</div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground/50"><Truck className="w-3.5 h-3.5" /> No truck assigned</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Last login: {d.lastLogin}</div>
              </div>
              <Badge variant="outline" className={d.status === "Active"
                ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
              }>{d.status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DriverCardGrid;
