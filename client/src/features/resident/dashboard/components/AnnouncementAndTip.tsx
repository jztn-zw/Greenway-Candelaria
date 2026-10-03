import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { useResidentQuery, useResidentFetch } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardStyles } from "../dashboardStyles";
import { ResidentDashboardUpdateSkeleton } from "@/components/PageLoadingSkeletons";
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
    return <ResidentDashboardUpdateSkeleton />;
  }

  if (loadFailed && announcementQuery.data === undefined) return <PageErrorState kind="unavailable" variant="section" title="Announcements couldn't load" description="We couldn't load official notices. Please try again." onRetry={() => void announcementQuery.refetch()} retrying={announcementQuery.isFetching} />;

  // Clean empty state when no active announcements exist in database
  if (!announcement) {
    return (
      <Card className="flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border/70">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="h-1 bg-muted shrink-0" />
          <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 min-h-[165px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  Latest announcement
                </p>
              </div>

              <p className="gw-heading text-base text-foreground">
                {loadFailed ? "Announcements unavailable" : "No active announcements"}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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
                <span className="hidden lg:inline">MENRO verified</span>
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
        className="group flex h-full min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/70 transition-colors duration-200 hover:border-primary/35 motion-reduce:transition-none"
        onClick={openAnnouncement}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Top accent bar matching post carousel */}
          <div className="h-0.5 bg-primary/20 shrink-0" />

          <div className={dashboardStyles.updateInner}>
            <div className={dashboardStyles.updateHeader}>
              <p className={dashboardStyles.label}>Latest announcement</p>
              <Badge className={"shrink-0 " + getCategoryBadgeColors(announcement.type).className}>{announcement.type}</Badge>
            </div>
            <div className={dashboardStyles.updateBody}>
              <p className={dashboardStyles.updateTitle}>{announcement.title}</p>
              <p className={dashboardStyles.updateExcerpt}>{announcement.body}</p>
            </div>
            <div className={dashboardStyles.updateFooter}>
              <div className="flex items-center gap-1.5 text-ui-caption font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="hidden lg:inline">MENRO verified</span>
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

