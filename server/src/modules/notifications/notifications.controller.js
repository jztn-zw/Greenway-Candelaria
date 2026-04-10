const service = require("./notifications.service");
const { sendNotificationSchema } = require("./notifications.schema");
const { success } = require("../../utils/apiResponse");

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await service.getMyNotifications(
      req.user.id,
      req.query,
    );
    return success(res, notifications, "Notifications fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await service.getUnreadCount(req.user.id);
    return success(res, count, "Unread count fetched");
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await service.markAsRead(req.params.id, req.user.id);
    return success(res, result, "Notification marked as read");
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await service.markAllAsRead(req.user.id);
    return success(res, result, "All notifications marked as read");
  } catch (err) {
    next(err);
  }
};

const deleteOne = async (req, res, next) => {
  try {
    const result = await service.deleteOne(req.params.id, req.user.id);
    return success(res, result, "Notification deleted");
  } catch (err) {
    next(err);
  }
};

const clearAll = async (req, res, next) => {
  try {
    const result = await service.clearAll(req.user.id);
    return success(res, result, "Notifications cleared");
  } catch (err) {
    next(err);
  }
};

const sendNotification = async (req, res, next) => {
  try {
    const data = sendNotificationSchema.parse(req.body);
    const result = await service.sendToMany(data);
    return success(res, result, "Notifications sent successfully", 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
  sendNotification,
};
