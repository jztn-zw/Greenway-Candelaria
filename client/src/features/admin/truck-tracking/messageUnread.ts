import type { DriverMessage } from "./types";
import { parseApiTimestamp } from "@/utils/date";

export interface SeenMessage {
  time: number;
  id: string;
}

export type SeenMessages = Record<string, SeenMessage>;

const storageKey = (adminId: string) => `greenway:admin-message-seen:${adminId}`;

export const messagePosition = (id: string, timestamp: string): SeenMessage | null => {
  const time = parseApiTimestamp(timestamp)?.getTime();
  return time === undefined ? null : { time, id };
};

export const isNewerMessage = (message: SeenMessage, seen?: SeenMessage) =>
  !seen || message.time > seen.time || (message.time === seen.time && message.id > seen.id);

export const unreadDriverMessageCount = (messages: DriverMessage[], seen?: SeenMessage) =>
  messages.filter((message) => {
    if (message.sender !== "driver") return false;
    const position = messagePosition(message.id, message.timestamp);
    return position !== null && isNewerMessage(position, seen);
  }).length;

export const loadSeenMessages = (adminId?: string): SeenMessages => {
  if (!adminId) return {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(adminId)) ?? "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved as SeenMessages : {};
  } catch { return {}; }
};

export const saveSeenMessages = (adminId: string, messages: SeenMessages) => {
  try { localStorage.setItem(storageKey(adminId), JSON.stringify(messages)); } catch { /* Keep the in-memory state when storage is unavailable. */ }
};
