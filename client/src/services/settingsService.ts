import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReminderTiming = '1h' | '3h' | '1d';
export type Language = 'en' | 'fil';

export interface UserSettings {
  id: string;
  user_id: string;

  // Notifications (simple on/off)
  notif_collection_reminders: boolean;
  notif_truck_near: boolean;
  notif_collection_done: boolean;
  notif_collection_skipped: boolean;
  notif_report_updates: boolean;
  notif_new_content: boolean;
  notif_announcements: boolean;

  // Collection preferences
  primary_barangay_id: string | null;
  reminder_on: boolean;
  reminder_timing: ReminderTiming;

  // Privacy
  profile_visible: boolean;

  // Language
  language: Language;
}

export type UpdateSettingsPayload = Partial<Omit<UserSettings, 'id' | 'user_id'>>;

// ─── API Functions ────────────────────────────────────────────────────────────

export const fetchUserSettings = async (): Promise<UserSettings> => {
  const { data } = await api.get<{ data: UserSettings }>('/users/settings');
  return data.data;
};

export const updateUserSettings = async (payload: UpdateSettingsPayload): Promise<UserSettings> => {
  const { data } = await api.put<{ data: UserSettings }>('/users/settings', payload);
  return data.data;
};
