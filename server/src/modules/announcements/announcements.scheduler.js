const { activateDueAnnouncements } = require("./announcements.service");

const startAnnouncementScheduler = () => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await activateDueAnnouncements();
    } catch (error) {
      console.error("[AnnouncementScheduler] Failed to process announcements:", error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), 60 * 1000);
  return () => clearInterval(timer);
};

module.exports = { startAnnouncementScheduler };
