import api from '@/lib/api';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
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
  created_at: string;
  last_login_at: string | null;
}

export interface UpdateProfilePayload {
  full_name?: string;
  username?: string;
  phone?: string;
  barangay_id?: string;
  street_id?: string | null;
  two_factor?: boolean;
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
};

export const uploadAvatar = async (file: File): Promise<{ avatar_url: string; user: UserProfile }> => {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await api.post<{ data: { avatar_url: string; user: UserProfile } }>(
    '/users/avatar',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
};

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await api.put('/users/change-password', payload);
};
