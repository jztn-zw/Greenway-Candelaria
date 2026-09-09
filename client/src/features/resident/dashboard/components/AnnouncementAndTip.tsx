import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import {
  fetchAnnouncementById,
  fetchAnnouncements,
} from "@/services/announcementsService";
import ResidentAnnouncementModal from "../../announcements/ResidentAnnouncementModal";
import type { AnnouncementDetail } from "../../announcements/ResidentAnnouncementModal";

interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string;
  type: string;
}

const formatNoticeType = (type?: string) => {
  if (!type) return "Notice";
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const AnnouncementAndTip = () => {
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [announcementDetail, setAnnouncementDetail] =
    useState<AnnouncementDetail | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchLatestAnnouncement = async () => {
      try {
        const list = await fetchAnnouncements({ status: "ACTIVE" });
        if (mounted && Array.isArray(list) && list.length > 0) {
          const featured =
            list.find((item: any) => item.is_featured || item.featured) || list[0];

          setAnnouncement({
            id: featured.id,
            title: featured.title,
            body: featured.body || "Read official updates from MENRO Candelaria.",
            type: formatNoticeType(featured.type),
          });
        } else if (mounted) {
          setAnnouncement(null);
        }
      } catch {
        if (mounted) {
          setAnnouncement(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchLatestAnnouncement();
    return () => {
      mounted = false;
    };
  }, []);

  const openAnnouncement = async () => {
    if (!announcement?.id) {
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

  // Loading skeleton while fetching on initial load or reload
  if (loading) {
    return (
      <Card className="h-full border border-border overflow-hidden flex flex-col justify-between">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="h-1 bg-primary/40 shrink-0" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 min-h-[165px] space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="w-28 h-3 rounded" />
                </div>
                <Skeleton className="w-16 h-4 rounded-full" />
              </div>
              <Skeleton className="w-3/4 h-5 rounded mt-1" />
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-2/3 h-4 rounded" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-20 h-4 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Clean empty state when no active announcements exist in database
  if (!announcement) {
    return (
      <Card className="h-full border border-border overflow-hidden flex flex-col justify-between">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="h-1 bg-muted shrink-0" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 min-h-[165px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Megaphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                    Official Announcement
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base font-bold text-foreground">
                No Active Announcements
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                There are no active bulletins or notices from MENRO Candelaria right now.
              </p>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => navigate("/resident/contents")}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                View all bulletins <ArrowRight className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">MENRO Verified</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Real active announcement
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
                  {announcement.type}
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
