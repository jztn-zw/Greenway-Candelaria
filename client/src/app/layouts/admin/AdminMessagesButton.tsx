import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { AdminMessenger } from "@/features/admin/messages/AdminMessenger";
import { useAdminQuery } from "@/lib/adminQuery";
import { fetchAllDrivers } from "@/services/trackingService";
import { fetchAdminUnreadMessages } from "@/services/messengerService";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import ActionButtonLoader from "@/components/common/ActionButtonLoader";
import { navigationStyles } from "../navigationStyles";

export default function AdminMessagesButton() {
  const [open, setOpen] = useState(false);
  const collectors = useAdminQuery("drivers", ["messenger"], fetchAllDrivers, {
    enabled: open,
    refetchInterval: 60_000,
  });
  const unread = useAdminQuery("tracking", ["messenger-unread"], fetchAdminUnreadMessages, { refetchInterval: 30_000 });
  const unreadCount = unread.data?.unreadCount ?? 0;

  return <AdminMessenger
    drivers={collectors.data ?? []}
    onOpenChange={setOpen}
    trigger={<button type="button" aria-label="Collector messages" title="Collector messages" className={navigationStyles.topbarButton}>
      <MessageCircle className="size-4" aria-hidden="true" />
      {unreadCount > 0 && <span aria-hidden="true" className={`${navigationStyles.unreadBadge} ${unreadCount > 9 ? "min-w-4 px-1" : "w-4"}`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      <span className="sr-only">{unreadCount} unread collector messages</span>
    </button>}
    collectorNotice={collectors.isLoading ? (
      <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><ActionButtonLoader className="gw-action-loader--compact" />Loading collectors…</p>
    ) : collectors.error ? (
      <DataRefreshNotice primary role="alert" message="Could not load collectors." onRetry={() => void collectors.refetch()} retrying={collectors.isFetching} />
    ) : undefined}
  />;
}
