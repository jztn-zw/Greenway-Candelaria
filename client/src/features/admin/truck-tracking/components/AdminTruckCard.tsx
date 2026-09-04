import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Truck,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  Radio,
  Settings2,
} from "lucide-react";
import AnimatedList from "@/components/AnimatedList";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AdminTruck, TruckStatus } from "../types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Convert time strings like "6:05 AM", "7:45 PM", or "18:30" -> "6:05am" / "7:45pm" */
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
    } catch {
      toast.error("Message could not be sent", {
        description: "Check the connection and try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-border/60" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>Messages</span>
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
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
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
                        "max-w-[80%] px-3 py-2 rounded-xl text-xs shadow-2xs",
                        isAdmin
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted text-foreground rounded-bl-xs"
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

          <div className="flex gap-2">
            <Input
              className="h-8 text-xs rounded-xl"
              placeholder="Type message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSend()}
              disabled={isSending}
            />
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl cursor-pointer"
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
  const [pendingStatus, setPendingStatus] = useState<TruckStatus | null>(null);
  const status = statusConfig[truck.status];
  const isNear = truck.barangaysAway !== null && truck.barangaysAway <= 3 && truck.status === "on-the-way";
  const progressPct = truck.totalBarangays > 0
    ? Math.min(100, Math.max(0, Math.round((truck.completedBarangays / truck.totalBarangays) * 100)))
    : 0;

  return (
    <Card
      className={cn(
        "transition-all duration-200 border rounded-2xl overflow-hidden shadow-2xs",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
          : "border-border/70 hover:border-primary/40 hover:shadow-xs bg-card"
      )}
    >
      <CardContent className="p-0">
        <div className="p-3.5 sm:p-4 cursor-pointer" onClick={onClick}>
          {/* Card Header: Vehicle Identity + Status & Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-colors border",
                truck.status === "on-the-way"
                  ? "bg-primary/10 text-primary border-primary/25"
                  : truck.status === "done"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted/80 text-muted-foreground border-border/80"
              )}>
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-display font-bold text-foreground leading-tight truncate">
                    {truck.name}
                  </h4>
                  <span className="text-[10px] text-muted-foreground/80 font-mono font-medium px-1.5 py-0.5 rounded-md bg-muted/60">
                    {truck.plateNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badge + Quick Override in Header */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 font-semibold rounded-lg tracking-wide uppercase",
                  status.className
                )}
              >
                {status.label}
              </Badge>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer transition-colors"
                    title="Manual Status Override"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 rounded-xl shadow-lg border border-border" align="end">
                  <p className="text-[10px] text-muted-foreground mb-1.5 font-medium px-1">Manual status override</p>
                  <div className="space-y-0.5">
                    {(["scheduled", "on-the-way", "done", "offline"] as TruckStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                          truck.status === s
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted text-foreground"
                        )}
                        disabled={truck.status === s}
                        onClick={() => setPendingStatus(s)}
                      >
                        {statusConfig[s].label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Structured Key-Value Metadata Grid */}
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
              <span className="text-muted-foreground/80 font-medium text-[11px] shrink-0">Current:</span>
              <span className={cn(
                "truncate",
                truck.currentBarangay ? "text-foreground font-semibold" : "italic text-muted-foreground/60 text-[11px]"
              )}>
                {truck.currentBarangay || "No route assigned"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
              <span className="text-muted-foreground/80 font-medium text-[11px] shrink-0">Driver:</span>
              <span className={cn(
                "truncate",
                truck.driver ? "text-foreground font-semibold" : "italic text-muted-foreground/60 text-[11px]"
              )}>
                {truck.driver || "Unassigned"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground/80 font-medium text-[11px] shrink-0">Waste:</span>
                {truck.wasteType && truck.wasteType !== "Not assigned" ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {truck.wasteType}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60 italic">
                    Not assigned
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
                <span>{truck.lastGpsUpdate}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {truck.totalBarangays > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px] font-medium">Route Progress</span>
                <span className="font-bold text-foreground text-[11px] tabular-nums">
                  {truck.completedBarangays}/{truck.totalBarangays} stops ({progressPct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {isNear && (
            <div className="mt-2.5 flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/15">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
              <p className="text-xs font-semibold text-primary">
                {truck.barangaysAway} barangay{truck.barangaysAway! > 1 ? "s" : ""} away from next stop
              </p>
            </div>
          )}
        </div>

        <MessageThread truck={truck} onSendMessage={onSendMessage} />

        {/* Route Details Accordion */}
        <div className="border-t border-border/60">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors cursor-pointer select-none"
            onClick={(e) => { e.stopPropagation(); setRouteExpanded(!routeExpanded); }}
          >
            <span className="font-semibold">Route Details ({truck.route.length} stops)</span>
            {routeExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {routeExpanded && (
            <div className="px-4 pb-3.5 max-h-48 overflow-y-auto">
              <div className="border border-border/80 rounded-xl overflow-hidden bg-card divide-y divide-border/60">
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
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "block truncate",
                          stop.state === "done" && "text-primary font-medium line-through decoration-primary/30",
                          stop.state === "in-progress" && "text-primary font-semibold",
                          stop.state === "skipped" && "text-destructive font-semibold",
                          stop.state === "not-started" && "text-foreground"
                        )}>
                          {stop.name}
                        </span>
                        {stop.state === "skipped" && stop.skippedReason && (
                          <span className="block text-[10px] text-destructive/80 italic truncate">
                            Reason: {stop.skippedReason}
                          </span>
                        )}
                      </div>
                      {stop.state === "done" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-medium rounded-md">
                          Done
                        </Badge>
                      )}
                      {stop.state === "skipped" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-destructive/15 text-destructive border-destructive/25 font-bold rounded-md">
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
      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm status override</AlertDialogTitle>
            <AlertDialogDescription>
              Change {truck.name} from {status.label} to{" "}
              {pendingStatus ? statusConfig[pendingStatus].label : "the selected status"}?
              This immediately updates the resident-facing tracking view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                pendingStatus === "offline" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={() => {
                if (pendingStatus) onStatusChange(truck.id, pendingStatus);
                setPendingStatus(null);
              }}
            >
              Confirm Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminTruckCard;
