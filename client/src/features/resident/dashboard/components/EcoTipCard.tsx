import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const tips = [
  "Reduce food waste by meal planning and storing leftovers properly.",
  "Composting kitchen scraps can reduce your household waste by up to 30%.",
  "Rinse recyclable containers before placing them in non-biodegradable bins.",
  "Avoid single-use plastics — bring your own eco-bags when visiting the market.",
  "Used cooking oil can be safely collected for biodiesel and soap production.",
];

const EcoTipCard = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((prev) => (prev + 1) % tips.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <Card className="bg-forest text-forest-foreground border-0 overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 shrink-0 opacity-80" />
          <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
            Did You Know?
          </p>
        </div>
        <p className="text-sm font-medium leading-relaxed opacity-95 line-clamp-3">
          "{tips[index]}"
        </p>
        <div className="flex items-center gap-1.5">
          {tips.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Tip ${i + 1}`}
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
