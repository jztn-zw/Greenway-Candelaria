// src/pages/admin/hooks/useBarangays.ts
import { useAdminQuery } from "@/lib/adminQuery";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import { useEffect } from "react";

export interface Barangay {
  id: string;
  name: string;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const useBarangays = () => {
  const query = useAdminQuery("barangays", ["route-options"], async () => {
    const { data } = await api.get<{ data: Barangay[] }>("/barangays");
    return data.data;
  });
  useEffect(() => { if (query.error) toast.error("Failed to load barangays."); }, [query.error]);
  return { barangays: query.data ?? [], isLoading: query.isLoading };
};
