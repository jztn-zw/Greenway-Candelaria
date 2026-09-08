const service = require("./routes.service");
const {
  createRouteSchema,
  updateRouteSchema,
  updateStopStatusSchema,
} = require("./routes.schema");
const { success } = require("../../utils/apiResponse");
const {
  broadcastLiveUpdate,
  broadcastRouteUpdate,
} = require("../../sockets/tracking.socket");

// ── NEW FUNCTIONS ──

const getMyRouteToday = async (req, res, next) => {
  try {
    const userId = req.user.id; // From auth middleware
    const myRoute = await service.getMyRouteToday(userId);

    if (!myRoute) {
      return res.status(404).json({ message: "No route assigned for today." });
    }

    return success(res, myRoute, "Today's route fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getAllRoutesToday = async (req, res, next) => {
  try {
    const routes = await service.getAllRoutesToday();
    return success(res, routes, "Today's routes fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getMissedCollections = async (req, res, next) => {
  try {
    const rows = await service.getMissedCollections(req.query);
    return success(res, rows, "Missed collection log fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ── EXISTING FUNCTIONS ──

const getAll = async (req, res, next) => {
  try {
    const routes = await service.getAll(req.query);
    return success(res, routes, "Routes fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const route = await service.getById(req.params.id);
    return success(res, route, "Route fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createRouteSchema.parse(req.body);
    const route = await service.create(data);
    return success(res, route, "Route created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateRouteSchema.parse(req.body);
    const route = await service.update(req.params.id, data);

    const io = req.app.get("io");
    broadcastLiveUpdate(io);
    broadcastRouteUpdate(io, {
      type: "route-updated",
      routeId: req.params.id,
      status: route.status ?? route.route_status ?? data.status ?? null,
    });

    return success(res, route, "Route updated successfully");
  } catch (err) {
    next(err);
  }
};

const updateStopStatus = async (req, res, next) => {
  try {
    const { status, skipped_reason } = updateStopStatusSchema.parse(req.body);
    const route = await service.updateStopStatus(
      req.params.id,
      req.params.stopId,
      status,
      skipped_reason,
    );

    const io = req.app.get("io");
    broadcastRouteUpdate(io, {
      type: "stop-status-updated",
      routeId: req.params.id,
      stopId: req.params.stopId,
      status,
    });

    return success(res, route, "Stop status updated");
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id);
    return success(res, result, "Route deleted successfully");
  } catch (err) {
    next(err);
  }
};

const endRoute = async (req, res, next) => {
  try {
    const result = await service.endRoute(req.params.id);

    const io = req.app.get("io");
    broadcastLiveUpdate(io);
    broadcastRouteUpdate(io, {
      type: "route-ended",
      routeId: req.params.id,
    });

    return success(res, result, "Route ended successfully");
  } catch (err) {
    next(err);
  }
};
// ── ADDED NEW FUNCTIONS TO EXPORTS ──
module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStopStatus,
  remove,
  getMyRouteToday,
  getAllRoutesToday,
  getMissedCollections,
  endRoute,
};
