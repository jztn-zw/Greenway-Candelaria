import api from "@/lib/api";

export interface BarangayLocationRow {
  id: string;
  name: string;
  zone?: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BarangayAdminRow {
  id: string;
  name: string;
  zone?: string | null;
  status: "ACTIVE" | "INACTIVE";
  is_priority?: boolean;
  notes?: string | null;
}

export const fetchBarangays = async (): Promise<BarangayLocationRow[]> => {
  const { data } = await api.get<{ data: BarangayLocationRow[] }>("/barangays");
  return data.data ?? [];
};

export const fetchBarangaysAdmin = async (): Promise<BarangayAdminRow[]> => {
  const { data } = await api.get<{ data: BarangayAdminRow[] }>("/barangays");
  return data.data ?? [];
};

export const fetchBarangayById = async (
  id: string,
): Promise<BarangayLocationRow> => {
  const { data } = await api.get<{ data: BarangayLocationRow }>(`/barangays/${id}`);
  return data.data;
};
