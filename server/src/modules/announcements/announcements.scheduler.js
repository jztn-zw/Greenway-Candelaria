const { activateDueAnnouncements, purgeArchivedAnnouncements } = require("./announcements.service");

const startAnnouncementScheduler = () => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await activateDueAnnouncements();
      await purgeArchivedAnnouncements();
    } catch (error) {
      console.error("[AnnouncementScheduler] Failed to process announcements:", error);
    } finally {
      running = false;
    }
  };
  void run();
  // Keep archive status in sync closely with the exact expiry time while
  // remaining lightweight for this small announcement table.
  const timer = setInterval(() => void run(), 15 * 1000);
  return () => clearInterval(timer);
};

module.exports = { startAnnouncementScheduler };
