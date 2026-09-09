const service = require("./drivers.service");
const {
  createDriverSchema,
  updateDriverSchema,
  assignTruckSchema,
  driverStatusSchema,
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
    return success(res, driver, "Driver profile fetched");
  } catch (err) {
    next(err);
  }
};

const getMyHistory = async (req, res, next) => {
  try {
    const history = await service.getMyHistory(req.user.id, req.query.limit);
    return success(res, history, "Driver route history fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createDriverSchema.parse(req.body);
    const driver = await service.create(data);
    return success(res, driver, "Driver created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateDriverSchema.parse(req.body);
    const driver = await service.update(req.params.id, data);
    return success(res, driver, "Driver updated successfully");
  } catch (err) {
    next(err);
  }
};

const assignTruck = async (req, res, next) => {
  try {
    const { truck_id } = assignTruckSchema.parse(req.body);
    const driver = await service.assignTruck(req.params.id, truck_id);
    return success(res, driver, "Truck assigned successfully");
  } catch (err) {
    next(err);
  }
};

const updateMyStatus = async (req, res, next) => {
  try {
    const { status_msg, route_id } = driverStatusSchema.parse(req.body);
    const driver = await service.updateStatusMsg(req.user.id, status_msg, route_id);
    await notifyAdmins({
      type: "SYSTEM",
      title: "New collector message",
      body: `${driver.full_name || driver.name || "A collector"}: ${status_msg}`,
      ref_id: route_id || driver.id,
      ref_module: "tracking",
    }).catch((err) => console.error("[Drivers] Admin message notification error:", err.message));
    return success(res, driver, "Status updated successfully");
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
    );
    return success(res, messages, "Driver messages fetched successfully");
  } catch (err) {
    next(err);
  }
};

const markMyMessagesAsRead = async (req, res, next) => {
  try {
    const result = await service.markMyMessagesAsRead(
      req.user.id,
      req.body?.route_id,
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

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id);
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
  updateMyStatus,
  getMyMessages,
  getMessagesForAdmin,
  markMyMessagesAsRead,
  sendMessageToDriver,
  getActivityLog,
  getMyHistory,
  remove,
};


