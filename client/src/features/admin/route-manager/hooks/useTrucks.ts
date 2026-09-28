// src/pages/admin/hooks/useTrucks.ts
import { useAdminQuery } from "@/lib/adminQuery";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { useEffect } from "react";

export interface Truck {
  id: string;
  name: string;
  plate_number: string;
}

export const useTrucks = () => {
  const query = useAdminQuery("trucks", ["route-options"], async () => {
    const { data } = await api.get<{ data: Truck[] }>("/trucks");
    return data.data;
  });
  useEffect(() => { if (query.error) toast.error("Failed to load trucks."); }, [query.error]);
  return { trucks: query.data ?? [], isLoading: query.isLoading };
};
