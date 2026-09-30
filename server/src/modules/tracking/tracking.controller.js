const service = require("./tracking.service");
const { pingSchema, roadRouteQuerySchema, streetCoverageRouteSchema } = require("./tracking.schema");
const { success } = require("../../utils/apiResponse");
const { broadcastLiveUpdate } = require("../../sockets/tracking.socket");

const ping = async (req, res, next) => {
  try {
    const data = pingSchema.parse(req.body);
    const log = await service.ping(req.user.id, data);

    // Broadcast to authenticated tracking subscribers.
    const io = req.app.get("io");
    broadcastLiveUpdate(io);

    return success(res, log, "Location pinged successfully", 201);
  } catch (err) {
    next(err);
  }
};

const getLive = async (req, res, next) => {
  try {
    const live = await service.getLive(req.user);
    return success(res, live, "Live tracking fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const logs = await service.getHistory(req.params.truckId, {
      date: req.query.date,
      limit: req.query.limit,
      cursor: req.query.cursor,
    });
    return success(res, logs, "Tracking history fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getAdminOverview = async (req, res, next) => {
  try {
    const overview = await service.getAdminOverview();
    return success(res, overview, "Admin tracking overview fetched successfully");
  } catch (err) {
    next(err);
  }
};

const clearHistory = async (req, res, next) => {
  try {
    const result = await service.clearHistory(req.params.truckId);
    return success(res, result, "Tracking history cleared");
  } catch (err) {
    next(err);
  }
};

const getRoadRoute = async (req, res, next) => {
  try {
    const { fromLng, fromLat, toLng, toLat } = roadRouteQuerySchema.parse(req.query);
    const route = await service.fetchRoadRoute(fromLng, fromLat, toLng, toLat);
    return success(res, route, "Road route fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getStreetCoverageRoute = async (req, res, next) => {
  try {
    const { points } = streetCoverageRouteSchema.parse(req.body);
    const route = await service.fetchStreetCoverageRoute(points);
    return success(res, route, "Street coverage matched to roads");
  } catch (err) {
    next(err);
  }
};

module.exports = { ping, getLive, getHistory, clearHistory, getAdminOverview, getRoadRoute, getStreetCoverageRoute };
