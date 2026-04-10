import { Card, CardContent } from "@/components/ui/card";
import { Award, Flame, TrendingUp } from "lucide-react";

const EngagementStreak = () => {
  // Mock data
  const reportsThisMonth = 3;
  const activeWeeks = 4;

  return (
    <Card className="border border-border overflow-hidden bg-gradient-to-r from-card to-primary/[0.03]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-foreground">
                Great job! You've been active for {activeWeeks} weeks straight
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                Keep it up — your engagement helps keep Candelaria clean!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span><strong className="text-foreground">{activeWeeks}</strong> week streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span><strong className="text-foreground">{reportsThisMonth}</strong> reports this month</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EngagementStreak;
