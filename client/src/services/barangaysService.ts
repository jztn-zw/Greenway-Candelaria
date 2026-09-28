import api from "@/lib/api";

export interface BarangayLocationRow {
  id: string;
  name: string;
  area?: string | null;
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

export interface BarangayStreetRow {
  id: string;
  barangay_id?: string;
  name: string;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverage_path?: [number, number][] | null;
}

export interface BarangayStreetsResponse {
  collection_service_available: boolean;
  streets: BarangayStreetRow[];
}

export interface BarangayManagerRow {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  collection_service_available: boolean;
  street_count: number;
  streets_with_path: number;
  active_route_count: number;
  live_run_count: number;
  latitude: number | null;
  longitude: number | null;
}

export interface ManagedStreet extends BarangayStreetRow {
  active_resident_count: number;
  account_link_count: number;
  route_plan_count: number;
  route_run_record_count: number;
}

export interface ManagedStreetsResponse {
  collection_service_available: boolean;
  streets: ManagedStreet[];
}

const normalizeCoveragePath = (value: unknown): [number, number][] | null => {
  if (!value) return null;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 500) return null;
    const points: [number, number][] = [];
    for (const point of parsed) {
      if (!Array.isArray(point) || point.length !== 2 ||
          typeof point[0] !== "number" || typeof point[1] !== "number") return null;
      const [latitude, longitude] = point;
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
      points.push([latitude, longitude]);
    }
    return points.some((point) => point[0] !== points[0][0] || point[1] !== points[0][1]) ? points : null;
  } catch {
    return null;
  }
};

const withNormalizedCoverage = <T extends BarangayStreetRow>(street: T): T => ({
  ...street,
  coverage_path: normalizeCoveragePath(street.coverage_path),
});

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

export const fetchBarangayStreets = async (
  id: string,
): Promise<BarangayStreetsResponse> => {
  const { data } = await api.get<{ data: BarangayStreetsResponse }>(`/barangays/${id}/streets`);
  return {
    ...data.data,
    streets: (data.data.streets ?? []).map(withNormalizedCoverage),
  };
};

export const fetchBarangaysManager = async (): Promise<BarangayManagerRow[]> => {
  const { data } = await api.get<{ data: BarangayManagerRow[] }>("/barangays/manage");
  return data.data ?? [];
};

export const fetchManagedStreets = async (barangayId: string): Promise<ManagedStreetsResponse> => {
  const { data } = await api.get<{ data: ManagedStreetsResponse }>(`/barangays/${barangayId}/streets/manage`);
  return {
    ...data.data,
    streets: (data.data.streets ?? []).map(withNormalizedCoverage),
  };
};

export const updateBarangayCollectionService = async (barangayId: string, available: boolean): Promise<void> => {
  await api.put(`/barangays/${barangayId}/collection-service`, { available });
};

export interface StreetInput {
  name: string;
  area: string | null;
}

export const createBarangayStreet = async (barangayId: string, street: StreetInput): Promise<void> => {
  await api.post(`/barangays/${barangayId}/streets`, street);
};

export const updateBarangayStreet = async (barangayId: string, streetId: string, street: StreetInput): Promise<void> => {
  await api.put(`/barangays/${barangayId}/streets/${streetId}`, street);
};

export const updateBarangayStreetCoverage = async (
  barangayId: string,
  streetId: string,
  coveragePath: [number, number][] | null,
): Promise<void> => {
  await api.put(`/barangays/${barangayId}/streets/${streetId}/coverage`, {
    coverage_path: coveragePath,
  });
};

export const deleteBarangayStreet = async (barangayId: string, streetId: string): Promise<void> => {
  await api.delete(`/barangays/${barangayId}/streets/${streetId}`);
};
