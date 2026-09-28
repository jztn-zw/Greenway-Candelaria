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
    const myRoute = await service.getMyRouteToday(userId, {
      includeFinished: req.query.include_finished === "true",
    });

    if (!myRoute) {
      return success(res, null, "No current route assigned for today.");
    }

    return success(res, myRoute, "Today's route fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getAllRoutesToday = async (req, res, next) => {
  try {
    const routes = await service.getAllRoutesToday(req.user);
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
    const routes = await service.getAll(req.query, req.user);
    return success(res, routes, "Routes fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const route = await service.getById(req.params.id, req.user);
    return success(res, route, "Route fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createRouteSchema.parse(req.body);
    const route = await service.create(data, req.user.id);
    return success(res, route, "Route created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateRouteSchema.parse(req.body);
    const route = await service.update(req.params.id, data, req.user.id);

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
      req.user,
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
    const result = await service.remove(req.params.id, req.user.id);
    return success(res, result, "Route deleted successfully");
  } catch (err) {
    next(err);
  }
};

const endRoute = async (req, res, next) => {
  try {
    const result = await service.endRoute(req.params.id, req.user);

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

const setRoutePaused = async (req, res, next) => {
  try {
    const result = await service.setRoutePaused(
      req.params.id,
      req.user.id,
      require("zod").z.boolean().parse(req.body?.paused),
    );
    const io = req.app.get("io");
    broadcastLiveUpdate(io);
    broadcastRouteUpdate(io, {
      type: result.status === "PAUSED" ? "route-paused" : "route-resumed",
      routeId: result.routeId,
      status: result.status,
    });
    return success(res, result, result.status === "PAUSED" ? "Route paused" : "Route resumed");
  } catch (err) {
    next(err);
  }
};

const startRoute = async (req, res, next) => {
  try {
    const route = await service.startRoute(req.params.id, req.user.id);
    const io = req.app.get("io");
    broadcastRouteUpdate(io, { type: "route-started", routeId: req.params.id, status: "ACTIVE" });
    return success(res, route, "Route started");
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
  setRoutePaused,
  startRoute,
};
