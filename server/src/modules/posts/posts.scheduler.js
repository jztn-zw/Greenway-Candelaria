const { publishDueScheduledPosts } = require("./posts.service");

const SCHEDULER_INTERVAL_MS = 60 * 1000;

const startPostScheduler = () => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;

    isRunning = true;
    try {
      await publishDueScheduledPosts();
    } catch (error) {
      console.error("[PostScheduler] Failed to publish scheduled posts:", error);
    } finally {
      isRunning = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), SCHEDULER_INTERVAL_MS);
  return () => clearInterval(timer);
};

module.exports = { startPostScheduler };
