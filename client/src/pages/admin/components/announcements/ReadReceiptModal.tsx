import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Users, Eye, TrendingDown } from "lucide-react";
import { Announcement } from "./types";

interface Props {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReadReceiptModal = ({ announcement, open, onOpenChange }: Props) => {
  if (!announcement) return null;

  const readPct = announcement.totalRecipients > 0
    ? Math.round((announcement.readCount / announcement.totalRecipients) * 100)
    : 0;

  // Sort by lowest read rate first
  const sortedStats = [...announcement.barangayReadStats].sort((a, b) => {
    const rateA = a.received > 0 ? a.read / a.received : 0;
    const rateB = b.received > 0 ? b.read / b.received : 0;
    return rateA - rateB;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Read Receipt Breakdown</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl p-4 border border-primary/10">
            <h4 className="text-sm font-semibold text-foreground line-clamp-1 mb-3">{announcement.title}</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-foreground">{announcement.totalRecipients.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Recipients</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-primary">{announcement.readCount.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Read</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-foreground">{readPct}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Rate</p>
              </div>
            </div>
            <Progress value={readPct} className="h-2 mt-3" />
          </div>

          {/* Per-barangay breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Per-Barangay Breakdown</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">
                <TrendingDown className="w-3 h-3 mr-1" /> Sorted by lowest
              </Badge>
            </div>

            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-2">
                {sortedStats.map((stat) => {
                  const rate = stat.received > 0 ? Math.round((stat.read / stat.received) * 100) : 0;
                  const isLow = rate < 40;

                  return (
                    <div
                      key={stat.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isLow ? "bg-destructive/5 border-destructive/15" : "bg-card border-border"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{stat.name}</span>
                          <span className={`text-xs font-bold ${isLow ? "text-destructive" : "text-primary"}`}>
                            {rate}%
                          </span>
                        </div>
                        <Progress value={rate} className={`h-1.5 ${isLow ? "[&>div]:bg-destructive" : ""}`} />
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stat.received} received</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stat.read} read</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReadReceiptModal;
