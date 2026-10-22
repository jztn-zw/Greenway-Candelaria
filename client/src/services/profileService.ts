import api from '@/lib/api';
import type { ResidentSetupLocation } from '@/types/residentLocation';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  two_factor: boolean;
  barangay_id: string | null;
  barangay_name: string | null;
  street_id: string | null;
  street_name: string | null;
  street_area: string | null;
  resident_location?: (ResidentSetupLocation & { barangayId: string; streetId: string }) | string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface UpdateProfilePayload {
  email?: string | null;
  full_name?: string;
  username?: string;
  phone?: string;
  barangay_id?: string;
  street_id?: string | null;
  resident_location?: ResidentSetupLocation;
  two_factor?: boolean;
  avatar_url?: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export { fetchMyReportStats } from './reportsService';
export type { ReportStats } from './reportsService';

export const fetchProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get<{ data: UserProfile }>('/users/profile');
  return data.data;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const { data } = await api.put<{ data: UserProfile }>('/users/profile', payload);
  return data.data;
};export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await api.put('/users/change-password', payload);
};
