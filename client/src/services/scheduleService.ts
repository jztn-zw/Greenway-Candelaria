import api from "@/lib/api";

export type EventType = "PRIVATE_EVENT" | "COMMUNITY_EVENT" | "COLLECTION_SCHEDULE";
export type EventVisibility = "PRIVATE" | "PUBLIC";
export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  event_type: EventType;
  visibility: EventVisibility;
  location?: string | null;
  barangay_id?: string | null;
  barangay_name?: string | null;
  status: EventStatus;
  created_by?: string;
  creator_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  event_type: EventType;
  visibility: EventVisibility;
  location?: string | null;
  barangay_id?: string | null;
  status?: EventStatus;
}

export interface CollectionScheduleDay {
  id: string;
  day_of_week: string;
  waste_type: "BIODEGRADABLE" | "NON_BIODEGRADABLE";
  created_at?: string;
  updated_at?: string;
}

export interface ReminderSetting {
  id: string;
  timing: number;
}

export const fetchCalendarEvents = async (params?: {
  month?: string;
  year?: string | number;
  event_type?: EventType;
  visibility?: EventVisibility;
  status?: EventStatus;
  barangay_id?: string;
}): Promise<CalendarEvent[]> => {
  const { data } = await api.get<{ data: CalendarEvent[] }>("/schedule/events", {
    params,
  });
  return data.data ?? [];
};

export const fetchCalendarEventById = async (id: string): Promise<CalendarEvent> => {
  const { data } = await api.get<{ data: CalendarEvent }>(`/schedule/events/${id}`);
  return data.data;
};

export const createCalendarEvent = async (
  payload: CreateEventPayload
): Promise<CalendarEvent> => {
  const { data } = await api.post<{ data: CalendarEvent }>("/schedule/events", payload);
  return data.data;
};

export const updateCalendarEvent = async (
  id: string,
  payload: Partial<CreateEventPayload>
): Promise<CalendarEvent> => {
  const { data } = await api.put<{ data: CalendarEvent }>(`/schedule/events/${id}`, payload);
  return data.data;
};

export const deleteCalendarEvent = async (id: string): Promise<void> => {
  await api.delete(`/schedule/events/${id}`);
};

export const fetchCollectionSchedule = async (): Promise<CollectionScheduleDay[]> => {
  const { data } = await api.get<{ data: CollectionScheduleDay[] }>("/schedule");
  return data.data ?? [];
};

export const updateCollectionSchedule = async (
  id: string,
  waste_type: "BIODEGRADABLE" | "NON_BIODEGRADABLE"
): Promise<CollectionScheduleDay> => {
  const { data } = await api.put<{ data: CollectionScheduleDay }>(`/schedule/${id}`, {
    waste_type,
  });
  return data.data;
};

export const fetchReminderSettings = async (): Promise<ReminderSetting> => {
  const { data } = await api.get<{ data: ReminderSetting }>("/schedule/reminders");
  return data.data;
};

export const updateReminderSettings = async (timing: number): Promise<ReminderSetting> => {
  const { data } = await api.put<{ data: ReminderSetting }>("/schedule/reminders", {
    timing,
  });
  return data.data;
};
