import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileText, Truck, Users, CheckCircle2 } from "lucide-react";

interface AttentionItem {
  id: string;
  description: string;
  timeAgo: string;
  priority: "high" | "medium" | "low";
  action: string;
  icon: React.ElementType;
}

const items: AttentionItem[] = [
  { id: "1", description: "3 pending reports older than 24 hours", timeAgo: "26 hours", priority: "high", action: "Review", icon: FileText },
  { id: "2", description: "2 unread contact messages from residents", timeAgo: "4 hours", priority: "medium", action: "View", icon: Users },
  { id: "3", description: "Route for Brgy. Kinatihan has no truck tomorrow", timeAgo: "1 hour", priority: "high", action: "Assign", icon: Truck },
  { id: "4", description: "5 similar reports in Brgy. Poblacion — possible duplicates", timeAgo: "2 hours", priority: "medium", action: "Check", icon: AlertTriangle },
];

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-muted text-muted-foreground",
};

const NeedsAttention = () => {
  const noIssues = items.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Needs Attention</CardTitle>
          <Badge variant="outline" className={`text-[10px] ${noIssues ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
            {noIssues ? "All Clear" : `${items.length} Issues`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {noIssues ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-primary mb-2" />
            <p className="text-sm font-medium text-primary">Everything looks good</p>
            <p className="text-xs text-muted-foreground mt-1">No issues detected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${priorityColors[item.priority]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {item.timeAgo} ago
                      </span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityColors[item.priority]}`}>
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2.5 shrink-0">
                    {item.action}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NeedsAttention;
