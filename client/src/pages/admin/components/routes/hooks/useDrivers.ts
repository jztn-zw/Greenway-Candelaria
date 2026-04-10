// src/pages/admin/hooks/useDrivers.ts
import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface Driver {
  id: string; // drivers.id (not user id)
  full_name: string; // from joined users.full_name
  truck_id?: string | null;
  truck_name?: string | null;
}

export const useDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get<{ data: Driver[] }>("/drivers");
        setDrivers(data.data);
      } catch (err) {
        toast.error("Failed to load drivers.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { drivers, isLoading };
};
