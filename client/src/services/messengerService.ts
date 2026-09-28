import api from "@/lib/api";
export interface WebMessage {
  id: string; route_id?: string | null; sender_role: string; sender_name: string;
  message: string; is_read: boolean; created_at: string;
}
export interface ConversationPage {
  items: WebMessage[]; target: WebMessage | null; unreadCount: number; nextCursor: string | null;
}
const endpoint = (driverId?: string) => driverId
  ? `/drivers/${encodeURIComponent(driverId)}/messages/conversation` : "/drivers/me/messages/conversation";
export const fetchConversation = async (driverId?: string, params?: { cursor?: string; message_id?: string }) => {
  const response = await api.get<{ data: ConversationPage }>(endpoint(driverId), { params: { limit: 50, ...params } });
  return response.data.data;
};
export const sendConversationMessage = async (message: string, requestId: string, driverId?: string) => {
  const response = await api.post<{ data: WebMessage }>(endpoint(driverId), { message, request_id: requestId });
  return response.data.data;
};
