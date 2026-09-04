import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Megaphone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import postsService from "@/services/postsService";

const defaultTips = [
  { id: "tip-1", excerpt: "Reduce food waste by meal planning and storing leftovers properly." },
  { id: "tip-2", excerpt: "Composting kitchen scraps can reduce your household waste by up to 30%." },
  { id: "tip-3", excerpt: "Rinse recyclable containers before placing them in non-biodegradable bins." },
  { id: "tip-4", excerpt: "Avoid single-use plastics — bring your own eco-bags when visiting the market." },
  { id: "tip-5", excerpt: "Used cooking oil can be safely collected for biodiesel and soap production." },
];

const AnnouncementAndTip = () => {
  const navigate = useNavigate();
  const [tipIndex, setTipIndex] = useState(0);
  const [announcement, setAnnouncement] = useState<{
    id?: string;
    title: string;
    body: string;
    isReal?: boolean;
  }>({
    title: "Proper Waste Segregation: A Complete Guide",
    body: "Learn how to properly segregate your waste into biodegradable and non-biodegradable categories per updated MENRO Candelaria guidelines.",
    isReal: false,
  });

  useEffect(() => {
    let mounted = true;
    const fetchLatestPost = async () => {
      try {
        const res = await postsService.getAll({ status: "PUBLISHED" });
        const list = Array.isArray(res) ? res : res?.data || [];
        if (mounted && list.length > 0) {
          const featured = list.find((p: any) => p.is_featured) || list[0];
          setAnnouncement({
            id: featured.id,
            title: featured.title,
            body: featured.body || featured.excerpt || "Read official updates from MENRO Candelaria.",
            isReal: true,
          });
        }
      } catch {
        // fallback to default announcement
      }
    };

    void fetchLatestPost();

    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % defaultTips.length);
    }, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const currentTip = defaultTips[tipIndex];

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
              {announcement.title}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
              {announcement.body}
            </p>
            <button
              onClick={() => {
                if (announcement.id) {
                  navigate(`/resident/contents?post=${announcement.id}`);
                } else {
                  navigate("/resident/contents");
                }
              }}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-3 hover:underline"
            >
              Read full post <ArrowRight className="w-3 h-3" />
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
          <div className="flex items-center gap-1.5 mt-4 pt-1">
            {defaultTips.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTipIndex(i)}
                aria-label={`Go to tip ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === tipIndex ? "bg-forest-foreground w-5" : "bg-forest-foreground/30 hover:bg-forest-foreground/60 w-1.5"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnouncementAndTip;
