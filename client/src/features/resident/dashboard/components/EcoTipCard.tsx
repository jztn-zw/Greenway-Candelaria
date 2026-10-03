import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const TIPS = [
  {
    title: "Sort waste at home",
    message:
      "Keep food scraps separate from plastic and other non-biodegradable waste to make proper disposal easier.",
  },
  {
    title: "Prepare recyclables",
    message:
      "Empty and rinse bottles and cans before setting them aside for recycling. Clean materials are easier to handle.",
  },
  {
    title: "Prevent litter",
    message:
      "Secure waste bags and keep them in a proper container until collection to help prevent spills and scattered trash.",
  },
  {
    title: "Check collection updates",
    message:
      "Check your collection schedule and truck updates in GreenWay so you know when to prepare your waste.",
  },
];

const EcoTipCard = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((prev) => (prev + 1) % TIPS.length), 7000);
    return () => clearInterval(t);
  }, []);

  const activeTip = TIPS[index];

  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.05] text-foreground">
      <CardContent className="flex h-full min-h-[180px] flex-col justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            Everyday waste tip
          </p>
        </div>
        <div className="min-h-[4.5rem]">
          <p className="gw-heading mb-1 text-base leading-snug">{activeTip.title}</p>
          <p className="break-words text-sm leading-relaxed text-muted-foreground">
            {activeTip.message}
          </p>
        </div>
        <div className="flex min-h-1 items-center gap-1">
          {TIPS.map((tip, i) => (
            <button
              key={tip.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show tip: ${tip.title}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-1 rounded-full transition-colors cursor-pointer ${
                i === index
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EcoTipCard;

