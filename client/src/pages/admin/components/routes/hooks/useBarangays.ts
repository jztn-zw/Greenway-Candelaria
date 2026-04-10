// src/pages/admin/hooks/useBarangays.ts
import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

export interface Barangay {
  id: string;
  name: string;
  zone: string | null;
}

export const useBarangays = () => {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get<{ data: Barangay[] }>("/barangays");
        // Sort alphabetically for consistent display
        setBarangays(data.data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        toast.error("Failed to load barangays.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { barangays, isLoading };
};
