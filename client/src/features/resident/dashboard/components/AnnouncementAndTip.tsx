import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchAnnouncementById,
  fetchAnnouncements,
} from "@/services/announcementsService";
import ResidentAnnouncementModal from "../../announcements/ResidentAnnouncementModal";
import type { AnnouncementDetail } from "../../announcements/ResidentAnnouncementModal";

const AnnouncementAndTip = () => {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<{
    id?: string;
    title: string;
    body: string;
    type?: string;
    isReal?: boolean;
  }>({
    title: "Proper Waste Segregation: A Complete Guide",
    body: "Learn how to properly segregate your waste into biodegradable and non-biodegradable categories per updated MENRO Candelaria guidelines.",
    type: "Notice",
    isReal: false,
  });
  const [announcementDetail, setAnnouncementDetail] =
    useState<AnnouncementDetail | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchLatestAnnouncement = async () => {
      try {
        const list = await fetchAnnouncements({ status: "ACTIVE" });
        if (mounted && list.length > 0) {
          const featured = list.find((item: any) => item.is_featured || item.featured) || list[0];
          setAnnouncement({
            id: featured.id,
            title: featured.title,
            body: featured.body || "Read official updates from MENRO Candelaria.",
            type: featured.type || "Notice",
            isReal: true,
          });
        }
      } catch {
        // fallback to default announcement
      }
    };

    void fetchLatestAnnouncement();
    return () => { mounted = false; };
  }, []);

  const openAnnouncement = async () => {
    if (!announcement.id) {
      navigate("/resident/contents");
      return;
    }
    try {
      const detail = await fetchAnnouncementById(announcement.id);
      setAnnouncementDetail(detail as AnnouncementDetail);
      setIsAnnouncementModalOpen(true);
    } catch {
      toast.info("This announcement is no longer available.");
    }
  };

  return (
    <>
      <Card
        className="group h-full border border-border overflow-hidden hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
        onClick={openAnnouncement}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Top accent bar matching post carousel */}
          <div className="h-1 bg-primary shrink-0" />

          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 min-h-[165px]">
            {/* Header row */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                    Official Announcement
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold shrink-0">
                  {announcement.type || "Notice"}
                </span>
              </div>

              {/* Title with matching consistent height */}
              <p className="text-sm sm:text-base font-bold text-foreground line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] group-hover:text-primary transition-colors leading-snug">
                {announcement.title}
              </p>

              {/* Excerpt with matching consistent height */}
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem] leading-relaxed">
                {announcement.body}
              </p>
            </div>

            {/* Footer matching post carousel */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAnnouncement();
                }}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                Read announcement <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">MENRO Verified</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ResidentAnnouncementModal
        open={isAnnouncementModalOpen}
        onOpenChange={setIsAnnouncementModalOpen}
        announcementId={announcementDetail?.id}
        initialAnnouncement={announcementDetail}
      />
    </>
  );
};

export default AnnouncementAndTip;
