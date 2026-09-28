import { expect, it } from "vitest";
import { messagePosition, unreadDriverMessageCount } from "./messageUnread";
import type { DriverMessage } from "./types";

const messages: DriverMessage[] = [
  { id: "a", sender: "driver", text: "First", timestamp: "2026-09-28 01:00:00" },
  { id: "b", sender: "admin", text: "Reply", timestamp: "2026-09-28 01:01:00" },
  { id: "c", sender: "driver", text: "Another update", timestamp: "2026-09-28 01:02:00" },
];

it("counts only collector messages since the admin last viewed the conversation", () => {
  expect(unreadDriverMessageCount(messages)).toBe(2);
  expect(unreadDriverMessageCount(messages, messagePosition("a", messages[0].timestamp)!)).toBe(1);
  expect(unreadDriverMessageCount(messages, messagePosition("c", messages[2].timestamp)!)).toBe(0);
});

it("does not show older snapshot messages after a newer conversation was viewed", () => {
  expect(unreadDriverMessageCount(messages, messagePosition("newer", "2026-09-28 01:05:00")!)).toBe(0);
});
