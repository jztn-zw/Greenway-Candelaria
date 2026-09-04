const service = require("./schedule.service");
const {
  updateScheduleSchema,
  updateReminderSchema,
  createEventSchema,
  updateEventSchema,
} = require("./schedule.schema");
const { success } = require("../../utils/apiResponse");

// ─── Centralized Calendar Events ───────────────────────────

const getEvents = async (req, res, next) => {
  try {
    const events = await service.getEvents(req.query, req.user);
    return success(res, events, "Calendar events fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await service.getEventById(req.params.id, req.user);
    return success(res, event, "Calendar event fetched successfully");
  } catch (err) {
    next(err);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await service.createEvent(data, req.user);
    return success(res, event, "Calendar event created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const data = updateEventSchema.parse(req.body);
    const event = await service.updateEvent(req.params.id, data, req.user);
    return success(res, event, "Calendar event updated successfully");
  } catch (err) {
    next(err);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const result = await service.deleteEvent(req.params.id, req.user);
    return success(res, result, "Calendar event deleted successfully");
  } catch (err) {
    next(err);
  }
};

// ─── Legacy 7-Day Collection Schedule ─────────────────────

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

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAll,
  update,
  getReminder,
  updateReminder,
};
