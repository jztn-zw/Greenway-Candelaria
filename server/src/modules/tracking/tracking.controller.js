const service = require("./tracking.service");
const { pingSchema } = require("./tracking.schema");
const { success } = require("../../utils/apiResponse");
const { broadcastLiveUpdate } = require("../../sockets/tracking.socket");

const ping = async (req, res, next) => {
  try {
    const data = pingSchema.parse(req.body);
    const log = await service.ping(req.user.id, data);

    // ✅ Trigger real-time broadcast to all connected Admins
    const io = req.app.get("io");
    broadcastLiveUpdate(io);

    return success(res, log, "Location pinged successfully", 201);
  } catch (err) {
    next(err);
  }
};

const getLive = async (req, res, next) => {
  try {
    const live = await service.getLive();
    return success(res, live, "Live tracking fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Added missing getHistory function
const getHistory = async (req, res, next) => {
  try {
    const logs = await service.getHistory(req.params.truckId);
    return success(res, logs, "Tracking history fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Added missing clearHistory function
const clearHistory = async (req, res, next) => {
  try {
    const result = await service.clearHistory(req.params.truckId);
    return success(res, result, "Tracking history cleared");
  } catch (err) {
    next(err);
  }
};

// Now all functions are defined and can be exported safely
module.exports = { ping, getLive, getHistory, clearHistory };
