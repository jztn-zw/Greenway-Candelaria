const service = require("./trucks.service");
const { createTruckSchema, updateTruckSchema } = require("./trucks.schema");
const { success } = require("../../utils/apiResponse");
const { broadcastLiveUpdate } = require("../../sockets/tracking.socket");

const getAll = async (req, res, next) => {
  try {
    const trucks = await service.getAll(req.user);
    return success(res, trucks, "Trucks fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const truck = await service.getById(req.params.id, req.user);
    return success(res, truck, "Truck fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createTruckSchema.parse(req.body);
    const truck = await service.create(data, req.user.id, req.ip);
    return success(res, truck, "Truck created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateTruckSchema.parse(req.body);
    const truck = await service.update(req.params.id, data, req.user.id, req.ip);
    if (data.status) {
      void broadcastLiveUpdate(req.app.get("io"));
    }
    return success(res, truck, "Truck updated successfully");
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id, req.user.id, req.ip);
    return success(res, result, "Truck deleted successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
