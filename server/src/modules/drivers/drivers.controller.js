const service = require("./drivers.service");
const {
  createDriverSchema,
  updateDriverSchema,
  assignTruckSchema,
  accountStatusSchema,
  resetDriverPasswordSchema,
  driverStatusSchema,
  breakdownReportSchema,
  adminDriverMessageSchema,
} = require("./drivers.schema");
const { success } = require("../../utils/apiResponse");
const { notifyAdmins } = require("../notifications/notifications.service");

const getAll = async (req, res, next) => {
  try {
    const drivers = await service.getAll();
    return success(res, drivers, "Drivers fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const driver = await service.getById(req.params.id);
    return success(res, driver, "Driver fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const driver = await service.getByUserId(req.user.id);
    if (req.query.view === "dashboard") {
      const { full_name, truck_id, truck_name, truck_plate, truck_status, truck_availability, truck_model } = driver;
      return success(res, { full_name, truck_id, truck_name, truck_plate, truck_status, truck_availability, truck_model }, "Driver dashboard profile fetched");
    }
    return success(res, driver, "Driver profile fetched");
  } catch (err) {
    next(err);
  }
};

const getMyHistory = async (req, res, next) => {
  try {
    const history = await service.getMyHistory(req.user.id, req.query.limit, req.query);
    return success(res, history, "Driver route history fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createDriverSchema.parse(req.body);
    const driver = await service.create(data, req.user.id, req.ip);
    return success(res, driver, "Driver created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateDriverSchema.parse(req.body);
    const driver = await service.update(req.params.id, data, req.user.id, req.ip);
    return success(res, driver, "Driver updated successfully");
  } catch (err) {
    next(err);
  }
};

const assignTruck = async (req, res, next) => {
  try {
    const { truck_id } = assignTruckSchema.parse(req.body);
    const driver = await service.assignTruck(req.params.id, truck_id, req.user.id, req.ip);
    return success(res, driver, "Truck assigned successfully");
  } catch (err) {
    next(err);
  }
};

const setAccountStatus = async (req, res, next) => {
  try {
    const { status } = accountStatusSchema.parse(req.body);
    const driver = await service.setAccountStatus(req.params.id, status, req.user.id, req.ip);
    return success(res, driver, "Collector account status updated successfully");
  } catch (err) {
    next(err);
  }
};

const updateMyStatus = async (req, res, next) => {
  try {
    const { status_msg, route_id } = driverStatusSchema.parse(req.body);
    const driver = await service.updateStatusMsg(req.user.id, status_msg, route_id);
    await notifyAdmins({
      category: "driver_messages",
      type: "SYSTEM",
      title: `New Collector Message: ${driver.full_name || driver.name || "Collector"}`,
      body: status_msg,
      ref_id: route_id || driver.id,
      ref_module: "tracking",
    }).catch((err) => console.error("[Drivers] Admin message notification error:", err.message));
    return success(res, driver, "Status updated successfully");
  } catch (err) {
    next(err);
  }
};

const reportBreakdown = async (req, res, next) => {
  try {
    const report = breakdownReportSchema.parse(req.body);
    return success(res, await service.reportBreakdown(req.user.id, report), "Breakdown reported successfully", 201);
  } catch (err) {
    next(err);
  }
};

const getMyMessages = async (req, res, next) => {
  try {
    const messages = await service.getMyMessages(
      req.user.id,
      req.query.route_id,
      req.query.limit,
      req.query.view,
      req.query.message_id,
    );
    return success(res, messages, "Driver messages fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getMessagesForAdmin = async (req, res, next) => {
  try {
    const messages = await service.getMessagesForAdmin(
      req.params.id,
      req.query.route_id,
      req.query.limit,
      req.query.view,
    );
    return success(res, messages, "Driver messages fetched successfully");
  } catch (err) {
    next(err);
  }
};

const markMyMessagesAsRead = async (req, res, next) => {
  try {
    const ids = req.body?.ids;
    require("./messenger.service").optionalId(req.body?.route_id);
    if (ids !== undefined && (!Array.isArray(ids) || ids.length > 301 || ids.some((id) => typeof id !== "string" || !id || id.length > 64))) {
      throw { statusCode: 400, message: "Invalid message IDs" };
    }
    const result = await service.markMyMessagesAsRead(
      req.user.id,
      req.body?.route_id,
      ids,
    );
    return success(res, result, "Driver messages marked as read");
  } catch (err) {
    next(err);
  }
};

const sendMessageToDriver = async (req, res, next) => {
  try {
    const data = adminDriverMessageSchema.parse(req.body);
    const result = await service.sendAdminMessageToDriver(
      req.user.id,
      data.driver_user_id,
      data.route_id,
      data.message,
    );
    return success(res, result, "Driver message sent successfully", 201);
  } catch (err) {
    next(err);
  }
};

const getActivityLog = async (req, res, next) => {
  try {
    const result = await service.getActivityLog(req.params.id, req.query.limit);
    return success(res, result, "Driver activity log fetched successfully");
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { password } = resetDriverPasswordSchema.parse(req.body);
    const result = await service.resetPassword(req.params.id, req.user.id, password);
    res.set("Cache-Control", "no-store");
    return success(res, result, "Collector password reset successfully");
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id, req.user.id, req.ip);
    return success(res, result, "Driver removed successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  getMe,
  create,
  update,
  assignTruck,
  setAccountStatus,
  updateMyStatus,
  reportBreakdown,
  getMyMessages,
  getMessagesForAdmin,
  markMyMessagesAsRead,
  sendMessageToDriver,
  getActivityLog,
  resetPassword,
  getMyHistory,
  remove,
};



// Separate web conversation endpoints preserve the legacy driver-status contract.
const messenger = require("./messenger.service");
module.exports.getWebConversation = async (req, res, next) => {
  try {
    const driver = await messenger.findDriver(req.user.id, req.user.role === "ADMIN" ? req.params.id : undefined);
    return success(res, await messenger.getConversation(driver.id, req.query), "Conversation fetched");
  } catch (error) { next(error); }
};
module.exports.sendWebMessage = async (req, res, next) => {
  try {
    const driver = await messenger.findDriver(req.user.id, req.user.role === "ADMIN" ? req.params.id : undefined);
    return success(res, await messenger.sendMessage(req.user, driver, req.body || {}), "Message saved");
  } catch (error) { next(error); }
};
