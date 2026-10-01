import { Bell } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const ReminderSettings = () => (
  <Card className="rounded-2xl border border-border/80">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="gw-heading text-sm ">Automatic Resident Reminders</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Sent 3 hours before collection to residents covered by active routes who allow reminders.</p>
        </div>
      </div>
    </CardHeader>
  </Card>
);
