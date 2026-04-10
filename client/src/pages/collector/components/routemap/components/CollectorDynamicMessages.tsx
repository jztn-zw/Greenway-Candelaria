import { useMemo, useState, useRef, useEffect } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DynamicMessage {
  id: string;
  sender: "admin" | "collector";
  senderName: string;
  text: string;
  timestamp: Date;
}

interface CollectorDynamicMessagesProps {
  systemMessages?: DynamicMessage[];
  unreadCount?: number;
  onOpen?: () => void;
  onSendReply?: (message: string) => Promise<void>;
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const CollectorDynamicMessages = ({
  systemMessages = [],
  unreadCount = 0,
  onOpen,
  onSendReply,
}: CollectorDynamicMessagesProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => [...systemMessages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    [systemMessages],
  );

  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [expanded, messages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      if (onSendReply) {
        await onSendReply(text);
      }
      setNewMessage("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => {
          if (!expanded) {
            onOpen?.();
          }
          setExpanded((prev) => !prev);
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-display font-semibold text-foreground">
              Messages
            </p>
            <p className="text-[10px] text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
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
          <div className="max-h-60 overflow-y-auto px-4 py-2 space-y-2 border-t border-border">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%] rounded-xl px-3 py-2",
                  msg.sender === "admin"
                    ? "self-start bg-muted"
                    : "self-end ml-auto bg-primary/10",
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      msg.sender === "admin"
                        ? "text-foreground"
                        : "text-primary",
                    )}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {msg.text}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <Input
              className="h-9 text-xs flex-1"
              placeholder="Type a reply..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSend()}
              disabled={isSending}
            />
            <Button
              size="sm"
              className="h-9 px-3"
              onClick={() => void handleSend()}
              disabled={!newMessage.trim() || isSending}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectorDynamicMessages;
