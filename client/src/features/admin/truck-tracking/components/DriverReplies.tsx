import { useEffect, useMemo, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  User,
  Truck as TruckIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminTruck, DriverMessage } from "../types";

interface DriverRepliesProps {
  trucks: AdminTruck[];
}

const parseServerTimestamp = (timestamp: string): Date | null => {
  const raw = String(timestamp || "").trim();
  if (!raw) return null;

  const mysqlMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  );

  if (mysqlMatch) {
    const [, year, month, day, hour, minute, second, ms = "0"] = mysqlMatch;
    const localDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(ms.padEnd(3, "0")),
    );
    const utcDate = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        Number(ms.padEnd(3, "0")),
      ),
    );

    const now = Date.now();
    return Math.abs(now - localDate.getTime()) <=
      Math.abs(now - utcDate.getTime())
      ? localDate
      : utcDate;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTime = (timestamp: string): string => {
  const parsed = parseServerTimestamp(timestamp);
  if (!parsed) return timestamp;
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getMessageMeta = (msg: DriverMessage) => {
  const senderRole = String(msg.senderRole ?? "").toUpperCase();
  const isAdmin = msg.sender === "admin" || senderRole === "ADMIN";

  return {
    isAdmin,
    senderLabel: msg.senderName?.trim() || (isAdmin ? "Admin" : "Driver"),
  };
};

const MessageBubble = ({ msg }: { msg: DriverMessage }) => {
  const { isAdmin, senderLabel } = getMessageMeta(msg);

  return (
    <div
      className={cn(
        "flex flex-col max-w-[85%] rounded-xl px-3 py-2",
        isAdmin ? "self-end ml-auto bg-primary/10" : "self-start bg-muted",
      )}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className={cn(
            "text-[10px] font-semibold",
            isAdmin ? "text-primary" : "text-foreground",
          )}
        >
          {senderLabel}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {formatTime(msg.timestamp)}
        </span>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{msg.text}</p>
    </div>
  );
};

const TruckMessageGroup = ({
  truck,
  onSendReply,
}: {
  truck: AdminTruck;
  onSendReply?: (truckId: string, text: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () =>
      [...truck.driverMessages].sort((a, b) => {
        const aMs = parseServerTimestamp(a.timestamp)?.getTime() ?? 0;
        const bMs = parseServerTimestamp(b.timestamp)?.getTime() ?? 0;
        return aMs - bMs;
      }),
    [truck.driverMessages],
  );

  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [expanded, sorted]);

  const handleSend = () => {
    const text = newMessage.trim();
    if (!text) return;
    onSendReply?.(truck.id, text);
    setNewMessage("");
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TruckIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                {truck.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                · {truck.plateNumber}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span>{truck.driver}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/15 font-medium shrink-0"
            >
              {truck.driverMessages.length} msg
              {truck.driverMessages.length > 1 ? "s" : ""}
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <>
          <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-2 border-t border-border">
            {sorted.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border">
            <Input
              className="h-9 text-xs flex-1"
              placeholder="Type a reply..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button
              size="sm"
              className="h-9 px-3"
              onClick={handleSend}
              disabled={!newMessage.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const DriverReplies = ({ trucks }: DriverRepliesProps) => {
  const trucksWithMessages = trucks.filter((t) => t.driverMessages.length > 0);
  const totalMessages = trucksWithMessages.reduce(
    (sum, t) => sum + t.driverMessages.length,
    0,
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-display font-semibold text-foreground">
          Message Thread
        </h3>
        {totalMessages > 0 && (
          <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
            {totalMessages}
          </span>
        )}
      </div>

      {trucksWithMessages.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto rounded-xl bg-muted flex items-center justify-center mb-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No messages yet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Admin and driver messages will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trucksWithMessages.map((truck) => (
            <TruckMessageGroup key={truck.id} truck={truck} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverReplies;
