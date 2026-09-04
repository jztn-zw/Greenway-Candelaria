const service = require("./barangays.service");
const { success } = require("../../utils/apiResponse");

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

module.exports = { getAll, getById };
