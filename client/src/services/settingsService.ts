import api from '@/lib/api';

export interface AdminAlertSettings {
  notif_admin_reports: boolean;
  notif_admin_route_issues: boolean;
  notif_admin_driver_messages: boolean;
}

export const fetchAdminAlertSettings = async (): Promise<AdminAlertSettings> => {
  const { data } = await api.get<{ data: AdminAlertSettings }>('/users/admin-settings');
  return data.data;
};

export const updateAdminAlertSettings = async (payload: AdminAlertSettings): Promise<AdminAlertSettings> => {
  const { data } = await api.put<{ data: AdminAlertSettings }>('/users/admin-settings', payload);
  return data.data;
};
