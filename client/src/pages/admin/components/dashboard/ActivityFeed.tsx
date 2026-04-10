import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, PanelRightClose, PanelRightOpen } from "lucide-react";

interface Activity {
  id: string;
  description: string;
  timeAgo: string;
  type: "completed" | "created" | "updated" | "critical";
}

const activities: Activity[] = [
  { id: "1", description: "Report WR-0047 marked as Under Review", timeAgo: "5 min ago", type: "updated" },
  { id: "2", description: "New resident Maria Santos registered", timeAgo: "12 min ago", type: "created" },
  { id: "3", description: "Truck 01 completed Brgy. Poblacion route", timeAgo: "25 min ago", type: "completed" },
  { id: "4", description: "Announcement scheduled for March 31", timeAgo: "1 hour ago", type: "created" },
  { id: "5", description: "Report WR-0044 resolved", timeAgo: "1 hour ago", type: "completed" },
  { id: "6", description: "Collection schedule updated for April", timeAgo: "2 hours ago", type: "updated" },
  { id: "7", description: "Driver Pedro Santos assigned to Truck 02", timeAgo: "2 hours ago", type: "updated" },
  { id: "8", description: "Report WR-0045 dispatched to Truck 01", timeAgo: "3 hours ago", type: "updated" },
  { id: "9", description: "Truck 02 went idle at Brgy. Malabanban", timeAgo: "3 hours ago", type: "critical" },
  { id: "10", description: "New report WR-0046 submitted", timeAgo: "4 hours ago", type: "created" },
];

const dotColors: Record<string, string> = {
  completed: "bg-primary",
  created: "bg-blue-500",
  updated: "bg-yellow-500",
  critical: "bg-destructive",
};

interface Props {
  isMobileDrawer?: boolean;
}

const ActivityFeedContent = () => (
  <>
    <ScrollArea className="h-[400px] lg:h-[600px]">
      <div className="space-y-1 pr-2">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-2.5 px-2 py-2.5 rounded-md hover:bg-muted/30 transition-colors">
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColors[a.type]}`} />
            <div className="min-w-0">
              <p className="text-xs text-foreground leading-snug">{a.description}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{a.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
    <div className="pt-3 border-t mt-2">
      <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0 gap-1">
        <ClipboardList className="w-3 h-3" /> View Full Audit Log
      </Button>
    </div>
  </>
);

const ActivityFeed = ({ isMobileDrawer }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sticky sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-20">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeedContent />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 gap-1.5 shadow-lg"
          onClick={() => setOpen(!open)}
        >
          {open ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          Activity
        </Button>

        {open && (
          <>
            <div className="fixed inset-0 bg-foreground/20 z-40" onClick={() => setOpen(false)} />
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border z-50 p-4 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Activity Feed</h3>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </div>
              <ActivityFeedContent />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ActivityFeed;
