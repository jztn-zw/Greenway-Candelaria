import api from "@/lib/api";

export interface ReportListRow {
  id: string;
  reference_number: string;
  barangay_id: string;
  violation_type: string;
  status: string;
  created_at: string;
}

export const fetchAllReports = async (
  params?: {
    barangay_id?: string;
    status?: string;
    priority?: string;
    violation_type?: string;
  },
): Promise<ReportListRow[]> => {
  const { data } = await api.get<{ data: ReportListRow[] }>("/reports", {
    params,
  });
  return data.data ?? [];
};
