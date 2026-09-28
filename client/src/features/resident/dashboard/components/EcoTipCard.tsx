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
    <Card className="h-full min-h-[210px] overflow-hidden border-0 bg-forest text-forest-foreground rounded-2xl">
      <CardContent className="flex h-full min-h-[210px] flex-col justify-between gap-3 p-4 lg:p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 shrink-0 opacity-80" />
          <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
            Did You Know?
          </p>
        </div>
        <div className="min-h-[4.5rem]">
          <p className="mb-1 text-sm font-semibold leading-snug">{activeTip.title}</p>
          <p className="text-sm leading-relaxed opacity-90 line-clamp-3">
            {activeTip.message}
          </p>
        </div>
        <div className="flex min-h-1.5 items-center gap-1.5">
          {TIPS.map((tip, i) => (
            <button
              key={tip.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show tip: ${tip.title}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === index
                  ? "bg-forest-foreground w-5"
                  : "bg-forest-foreground/30 hover:bg-forest-foreground/60 w-1.5"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EcoTipCard;

