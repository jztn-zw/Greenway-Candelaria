// src/pages/admin/hooks/useDrivers.ts
import { useAdminQuery } from "@/lib/adminQuery";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { useEffect } from "react";

export interface Driver {
  id: string; // drivers.id (not user id)
  full_name: string; // from joined users.full_name
  truck_id?: string | null;
  truck_name?: string | null;
}

export const useDrivers = () => {
  const query = useAdminQuery("drivers", ["route-options"], async () => {
    const { data } = await api.get<{ data: Driver[] }>("/drivers");
    return data.data;
  });
  useEffect(() => { if (query.error) toast.error("Failed to load drivers."); }, [query.error]);
  return { drivers: query.data ?? [], isLoading: query.isLoading };
};
