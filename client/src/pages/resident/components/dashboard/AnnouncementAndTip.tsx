import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Megaphone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock: In production, pulled from admin Posts module (published Waste Tips)
const dynamicTips = [
  { id: "tip-1", excerpt: "Reduce food waste by meal planning and storing leftovers properly.", postId: "p1" },
  { id: "tip-2", excerpt: "Composting kitchen scraps can reduce your waste by up to 30%.", postId: "p2" },
  { id: "tip-3", excerpt: "Rinse containers before placing them in non-biodegradable bins.", postId: "p3" },
  { id: "tip-4", excerpt: "Avoid single-use plastics — bring your own bags when shopping.", postId: "p4" },
  { id: "tip-5", excerpt: "Used cooking oil can be collected for biodiesel production.", postId: "p5" },
];

const AnnouncementAndTip = () => {
  const navigate = useNavigate();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % dynamicTips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentTip = dynamicTips[tipIndex];

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-5">
      {/* Announcement */}
      <Card className="md:col-span-3 border border-border overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="h-1 bg-primary" />
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Latest Announcement
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                New
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-foreground">
              Proper Waste Segregation: A Complete Guide
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
              Learn how to properly segregate your waste into biodegradable and non-biodegradable categories
              per the updated MENRO Candelaria guidelines.
            </p>
            <button
              onClick={() => navigate("/resident/contents")}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-3 hover:underline"
            >
              Read more <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Tip Carousel */}
      <Card className="md:col-span-2 bg-forest text-forest-foreground border-0 overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full min-h-[160px]">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 shrink-0 opacity-80" />
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
              Did You Know?
            </p>
          </div>
          <p className="text-sm font-medium mt-3 leading-relaxed opacity-95">
            "{currentTip.excerpt}"
          </p>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5">
              {dynamicTips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTipIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === tipIndex ? "bg-forest-foreground w-5" : "bg-forest-foreground/30 w-1.5"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => navigate("/resident/contents")}
              className="text-[10px] font-semibold opacity-70 hover:opacity-100 flex items-center gap-1"
            >
              Read more <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnouncementAndTip;
