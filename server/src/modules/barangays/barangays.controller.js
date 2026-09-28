const service = require("./barangays.service");
const auditService = require("../audit/audit.service");
const { success } = require("../../utils/apiResponse");

const auditChange = (req, action, recordId, newValue) => auditService.log({
  user_id: req.user.id,
  action,
  module: "barangays",
  record_id: recordId,
  new_value: newValue,
  ip_address: req.ip,
});

const getAll = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const barangays = await service.getAll({ search, status });
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

const getStreets = async (req, res, next) => {
  try {
    const streets = await service.getStreets(req.params.id);
    return success(res, streets, "Barangay streets fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getManagerOverview = async (req, res, next) => {
  try {
    return success(res, await service.getManagerOverview(), "Barangay overview fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getManagerStreets = async (req, res, next) => {
  try {
    return success(res, await service.getManagerStreets(req.params.id), "Street usage fetched successfully");
  } catch (err) {
    next(err);
  }
};

const updateCollectionService = async (req, res, next) => {
  try {
    const result = await service.updateCollectionService(req.params.id, req.body?.available);
    await auditChange(req, "UPDATE_BARANGAY_SERVICE", req.params.id, result);
    return success(res, result, "Collection availability updated successfully");
  } catch (err) {
    next(err);
  }
};

const createStreet = async (req, res, next) => {
  try {
    const result = await service.createStreet(req.params.id, req.body);
    await auditChange(req, "CREATE_BARANGAY_STREET", result.id, result);
    return success(res, result, "Street added successfully", 201);
  } catch (err) {
    next(err);
  }
};

const updateStreet = async (req, res, next) => {
  try {
    const result = await service.updateStreet(req.params.id, req.params.streetId, req.body);
    await auditChange(req, "UPDATE_BARANGAY_STREET", result.id, result);
    return success(res, result, "Street updated successfully");
  } catch (err) {
    next(err);
  }
};

const updateStreetCoverage = async (req, res, next) => {
  try {
    const result = await service.updateStreetCoverage(
      req.params.id,
      req.params.streetId,
      req.body?.coverage_path,
    );
    await auditChange(req, "UPDATE_STREET_COVERAGE", req.params.streetId, result);
    return success(res, result, "Street coverage saved successfully");
  } catch (err) {
    next(err);
  }
};

const deleteStreet = async (req, res, next) => {
  try {
    const result = await service.deleteStreet(req.params.id, req.params.streetId);
    await auditChange(req, "DELETE_BARANGAY_STREET", result.id, result);
    return success(res, result, "Street deleted successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  getStreets,
  getManagerOverview,
  getManagerStreets,
  updateCollectionService,
  createStreet,
  updateStreet,
  updateStreetCoverage,
  deleteStreet,
};
