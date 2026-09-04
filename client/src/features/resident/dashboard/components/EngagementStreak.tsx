import { Card, CardContent } from "@/components/ui/card";
import { Award, Flame, TrendingUp } from "lucide-react";

const EngagementStreak = () => {
  const reportsThisMonth = 3;
  const activeWeeks = 4;

  return (
    <Card className="border border-border/80 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                Great job! You've been active for {activeWeeks} weeks straight
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Keep it up — your engagement helps keep Candelaria clean!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flame className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">{activeWeeks}</strong> week streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">{reportsThisMonth}</strong> reports this month</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EngagementStreak;

