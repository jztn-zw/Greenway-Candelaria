// src/pages/admin/hooks/useTrucks.ts
import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";
import api from "@/lib/api";

export interface Truck {
  id: string;
  name: string;
  plate_number: string;
}

export const useTrucks = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get<{ data: Truck[] }>("/trucks");
        setTrucks(data.data);
      } catch (err) {
        toast.error("Failed to load trucks.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { trucks, isLoading };
};
