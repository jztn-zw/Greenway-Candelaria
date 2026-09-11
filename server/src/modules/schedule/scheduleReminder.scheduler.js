const { dispatchDueCollectionReminders } = require("./schedule.service");

const SCHEDULER_INTERVAL_MS = 60 * 1000;

const startScheduleReminderScheduler = () => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await dispatchDueCollectionReminders();
    } catch (error) {
      console.error("[ScheduleReminderScheduler] Failed to send collection reminders:", error);
    } finally {
      isRunning = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), SCHEDULER_INTERVAL_MS);
  return () => clearInterval(timer);
};

module.exports = { startScheduleReminderScheduler };
