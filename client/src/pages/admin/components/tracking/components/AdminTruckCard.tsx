import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Truck, MapPin, User, ChevronDown, ChevronUp, MessageSquare, Send,
  Clock, CheckCircle2, Circle, Loader2, AlertTriangle, Radio, Settings2
} from "lucide-react";
import AnimatedList from "@/components/AnimatedList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AdminTruck, TruckStatus, DriverMessage } from "../types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Convert time strings like "6:05 AM", "7:45 PM", or "18:30" â†’ "6:05am" / "7:45pm" */
const formatTime12h = (raw: string): string => {
  const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    const [, h, m, period] = ampmMatch;
    return `${h}:${m}${period.toLowerCase()}`;
  }
  const h24Match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    let hour = parseInt(h24Match[1], 10);
    const min = h24Match[2];
    const period = hour >= 12 ? "pm" : "am";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${min}${period}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    let hour = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const period = hour >= 12 ? "pm" : "am";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${min}${period}`;
  }
  return raw;
};

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
    return Math.abs(now - localDate.getTime()) <= Math.abs(now - utcDate.getTime())
      ? localDate
      : utcDate;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Format message timestamp to relative or short time */
const formatMessageTime = (timestamp: string): string => {
  const d = parseServerTimestamp(timestamp);
  if (!d) return timestamp;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

interface AdminTruckCardProps {
  truck: AdminTruck;
  isSelected: boolean;
  onClick: () => void;
  onStatusChange: (truckId: string, status: TruckStatus) => void;
  onSendMessage: (truck: AdminTruck, message: string) => Promise<void>;
}

const statusConfig: Record<TruckStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  "on-the-way": { label: "On The Way", className: "bg-primary/15 text-primary border-primary/25" },
  done: { label: "Done", className: "bg-leaf/15 text-leaf border-leaf/25" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground border-border" },
};

/** Collapsible message thread with send input */
const MessageThread = ({
  truck,
  onSendMessage,
}: {
  truck: AdminTruck;
  onSendMessage: (truck: AdminTruck, message: string) => Promise<void>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sorted = [...truck.driverMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Auto-scroll to bottom when expanded or new messages arrive
  useEffect(() => {
    if (expanded && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [expanded, sorted.length]);

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    if (!truck.driverUserId) {
      toast.error("No driver assigned", {
        description: "Assign a driver to this truck before sending a message.",
      });
      return;
    }
    try {
      setIsSending(true);
      await onSendMessage(truck, trimmed);
      setMessageText("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-border" onClick={(e) => e.stopPropagation()}>
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          Messages
        </span>
        <span className="flex items-center gap-1.5">
          {truck.driverMessages.length > 0 && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-semibold"
            >
              {truck.driverMessages.length}
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Scrollable message list â€“ fixed height */}
          <div
            ref={scrollRef}
            className="h-[168px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin"
          >
            {sorted.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[11px] text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              sorted.map((msg) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isAdmin ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-3 py-2 rounded-xl text-xs",
                        isAdmin
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      <div
                        className={cn(
                          "mb-1 flex items-center justify-between gap-2 text-[10px]",
                          isAdmin
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        <p className="font-semibold">
                          {isAdmin ? "You" : msg.senderName || truck.driver || "Driver"}
                        </p>
                        <p className="tabular-nums whitespace-nowrap">
                          {formatMessageTime(msg.timestamp)}
                        </p>
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send input */}
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs"
              placeholder="Type message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSend()}
              disabled={isSending}
            />
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={() => void handleSend()}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminTruckCard = ({
  truck,
  isSelected,
  onClick,
  onStatusChange,
  onSendMessage,
}: AdminTruckCardProps) => {
  const [routeExpanded, setRouteExpanded] = useState(false);
  const status = statusConfig[truck.status];
  const isNear = truck.barangaysAway !== null && truck.barangaysAway <= 3 && truck.status === "on-the-way";

  return (
    <Card
      className={cn(
        "transition-all duration-200 border overflow-hidden",
        isSelected
          ? "border-primary ring-1 ring-primary/20 bg-primary/[0.02]"
          : "border-border hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <CardContent className="p-0">
        {/* Header - clickable for map focus */}
        <div className="p-4 cursor-pointer" onClick={onClick}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                truck.status === "on-the-way" ? "bg-primary/10" : "bg-muted"
              )}>
                <Truck className={cn("w-5 h-5", truck.status === "on-the-way" ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold text-foreground">{truck.name}</p>
                <p className="text-xs text-muted-foreground">{truck.plateNumber}</p>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className={!truck.currentBarangay ? "italic text-muted-foreground/60" : ""}>
                {truck.currentBarangay || "No route assigned"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className={!truck.driver ? "italic text-muted-foreground/60" : ""}>
                {truck.driver || "No driver assigned"}
              </span>
            </div>
            {truck.wasteType && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3.5 h-3.5 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <span className="text-foreground font-medium">{truck.wasteType}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Last update: {truck.lastGpsUpdate}</span>
            </div>
          </div>

          {/* Progress bar */}
          {truck.totalBarangays > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Route Progress</span>
                <span className="font-semibold text-foreground">
                  {truck.completedBarangays}/{truck.totalBarangays}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all duration-700 ease-out"
                  style={{ width: `${(truck.completedBarangays / truck.totalBarangays) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Proximity indicator */}
          {isNear && (
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
              <p className="text-xs font-semibold text-primary">
                {truck.barangaysAway} barangay{truck.barangaysAway! > 1 ? "s" : ""} away from next stop
              </p>
            </div>
          )}
        </div>

        {/* Status override */}
        <div className="px-4 pb-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium shrink-0">Status</span>
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-semibold", status.className)}>
              {status.label}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground ml-auto">
                  <Settings2 className="w-3 h-3" />
                  Override
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-[10px] text-muted-foreground mb-2 font-medium">Manual status override</p>
                <div className="space-y-1">
                  {(["scheduled", "on-the-way", "done", "offline"] as TruckStatus[]).map((s) => (
                    <button
                      key={s}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
                        truck.status === s
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-foreground"
                      )}
                      onClick={() => onStatusChange(truck.id, s)}
                    >
                      {statusConfig[s].label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Message thread (collapsible) */}
        <MessageThread truck={truck} onSendMessage={onSendMessage} />

        {/* Route dropdown */}
        <div className="border-t border-border">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
            onClick={(e) => { e.stopPropagation(); setRouteExpanded(!routeExpanded); }}
          >
            <span>Route Details ({truck.route.length} stops)</span>
            {routeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {routeExpanded && (
            <div className="px-4 pb-3 max-h-48 overflow-y-auto">
              <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
                <AnimatedList
                  items={truck.route}
                  getKey={(stop) => stop.name}
                  className=""
                >
                  {(stop) => (
                    <div className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-xs",
                      stop.state === "skipped" && "bg-destructive/5",
                      stop.state === "done" && "bg-primary/5"
                    )}>
                      {stop.state === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                      {stop.state === "in-progress" && <Loader2 className="w-3.5 h-3.5 text-primary shrink-0 animate-spin" />}
                      {stop.state === "skipped" && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      {stop.state === "not-started" && <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                      <span className={cn(
                        "flex-1",
                        stop.state === "done" && "text-primary font-medium line-through decoration-primary/30",
                        stop.state === "in-progress" && "text-primary font-semibold",
                        stop.state === "skipped" && "text-destructive font-semibold",
                        stop.state === "not-started" && "text-foreground"
                      )}>
                        {stop.name}
                      </span>
                      {stop.state === "done" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-medium">
                          Done
                        </Badge>
                      )}
                      {stop.state === "skipped" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-destructive/15 text-destructive border-destructive/25 font-bold">
                          Skipped
                        </Badge>
                      )}
                      {stop.completedAt && stop.state === "done" && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime12h(stop.completedAt)}</span>
                      )}
                    </div>
                  )}
                </AnimatedList>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminTruckCard;

