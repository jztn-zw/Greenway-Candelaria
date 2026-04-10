const service = require("./barangays.service");
const { updateBarangaySchema } = require("./barangays.schema");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const { search, zone, status, priority } = req.query;
    const barangays = await service.getAll({ search, zone, status, priority });
    return success(res, barangays, "Barangays fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const barangay = await service.getById(req.params.id);
    return success(res, barangay, "Barangay fetched successfully");
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateBarangaySchema.parse(req.body);
    const barangay = await service.update(req.params.id, data);
    return success(res, barangay, "Barangay updated successfully");
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await service.getStats(req.params.id);
    return success(res, stats, "Barangay stats fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getAdminOverview = async (req, res, next) => {
  try {
    const { search, zone, status, priority } = req.query;
    const rows = await service.getAdminOverview({ search, zone, status, priority });
    return success(res, rows, "Barangay admin overview fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, update, getStats, getAdminOverview };
