const service = require("./schedule.service");
const {
  updateScheduleSchema,
  updateReminderSchema,
} = require("./schedule.schema");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const schedule = await service.getAll();
    return success(res, schedule, "Schedule fetched successfully");
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateScheduleSchema.parse(req.body);
    const entry = await service.update(req.params.id, data);
    return success(res, entry, "Schedule updated successfully");
  } catch (err) {
    next(err);
  }
};

const getReminder = async (req, res, next) => {
  try {
    const reminder = await service.getReminder();
    return success(res, reminder, "Reminder settings fetched");
  } catch (err) {
    next(err);
  }
};

const updateReminder = async (req, res, next) => {
  try {
    const data = updateReminderSchema.parse(req.body);
    const reminder = await service.updateReminder(data);
    return success(res, reminder, "Reminder settings updated");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, update, getReminder, updateReminder };
