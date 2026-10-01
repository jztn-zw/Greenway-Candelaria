import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { useResidentQuery, useResidentFetch } from "@/lib/residentQuery";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import {
  fetchAnnouncementById,
  fetchAnnouncements,
} from "@/services/announcementsService";
import ResidentAnnouncementModal from "../../announcements/ResidentAnnouncementModal";
import type { AnnouncementDetail } from "../../announcements/ResidentAnnouncementModal";
import type { Announcement } from "@/features/admin/announcements/types";

type ResidentAnnouncementListItem = Announcement & {
  is_featured?: boolean | number;
  featured?: boolean | number;
};

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
  const [announcementDetail, setAnnouncementDetail] =
    useState<AnnouncementDetail | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  const announcementQuery = useResidentQuery("announcements", ["active"], () => fetchAnnouncements({ status: "ACTIVE" }));
  const residentList = (announcementQuery.data ?? []) as ResidentAnnouncementListItem[];
  const featured = residentList.find((item) => item.is_featured || item.featured) ?? residentList[0];
  const announcement: ActiveAnnouncement | null = featured
    ? { id: featured.id, title: featured.title, body: featured.body || "", type: formatNoticeType(featured.type) } : null;
  const loading = announcementQuery.isLoading;
  const loadFailed = announcementQuery.isError;
  const fetchResident = useResidentFetch();

  const openAnnouncement = async () => {
    if (!announcement?.id) {
      navigate("/resident/contents");
      return;
    }
    try {
      const detail = await fetchResident("announcements", ["detail", announcement.id], () => fetchAnnouncementById(announcement.id));
      setAnnouncementDetail(detail as AnnouncementDetail);
      setIsAnnouncementModalOpen(true);
    } catch {
      toast.info("This announcement is no longer available.");
    }
  };

  // Loading skeleton while fetching on initial load or reload
  if (loading) {
    return (
      <Card className="h-full border border-border overflow-hidden flex flex-col justify-between rounded-2xl">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="h-1 bg-primary/40 shrink-0" />
          <div className="p-4 lg:p-5 flex flex-col justify-between flex-1 min-h-[165px] space-y-3">
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
      <Card className="h-full border border-border overflow-hidden flex flex-col justify-between rounded-2xl">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="h-1 bg-muted shrink-0" />
          <div className="p-4 lg:p-5 flex flex-col justify-between flex-1 min-h-[165px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <p className="text-ui-caption font-bold text-muted-foreground uppercase tracking-wider truncate">
                  Latest Announcement
                </p>
              </div>

              <p className="text-sm lg:text-base font-bold text-foreground">
                {loadFailed ? "Announcements unavailable" : "No Active Announcements"}
              </p>
              <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {loadFailed
                  ? "Official notices could not be loaded right now."
                  : "There are no active bulletins or notices from MENRO Candelaria right now."}
              </p>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => navigate("/resident/contents")}
                className="gw-action-primary-ghost group inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all"
              >
                View all bulletins <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <div className="flex items-center gap-1.5 text-ui-caption text-muted-foreground font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="hidden lg:inline">MENRO Verified</span>
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
        className="group h-full border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col justify-between rounded-2xl"
        onClick={openAnnouncement}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Top accent bar matching post carousel */}
          <div className="h-1 bg-primary shrink-0" />

          <div className="p-4 lg:p-5 flex flex-col justify-between flex-1 min-h-[165px]">
            {/* Header row */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <p className="text-ui-caption font-bold text-muted-foreground uppercase tracking-wider truncate">
                  Latest Announcement
                </p>
                <span className={"px-2 py-0.5 rounded-md border text-ui-overline font-bold shrink-0 " + getCategoryBadgeColors(announcement.type).className}>
                  {announcement.type}
                </span>
              </div>

              {/* Title with matching consistent height */}
              <p className="text-sm lg:text-base font-bold text-foreground line-clamp-2 min-h-[2.5rem] lg:min-h-[2.75rem] group-hover:text-primary transition-colors leading-snug">
                {announcement.title}
              </p>

              {/* Excerpt with matching consistent height */}
              <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2 min-h-[2rem] lg:min-h-[2.25rem] leading-relaxed">
                {announcement.body}
              </p>
            </div>

            {/* Footer matching post carousel */}
            <div className="mt-2 flex items-center justify-end border-t border-border/40 pt-2">
              <div className="flex items-center gap-1.5 text-ui-caption text-muted-foreground font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="hidden lg:inline">MENRO Verified</span>
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

