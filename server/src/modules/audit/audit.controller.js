const service = require("./audit.service");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query);
    return success(res, data, "Audit logs fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const log = await service.getById(req.params.id);
    return success(res, log, "Audit log fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getFilterOptions = async (req, res, next) => {
  try {
    const filters = await service.getFilterOptions();
    return success(res, filters, "Filter options fetched successfully");
  } catch (err) {
    next(err);
  }
};

const clearAll = async (req, res, next) => {
  try {
    const result = await service.clearAll();
    return success(res, result, "Audit logs cleared");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getFilterOptions, clearAll };
