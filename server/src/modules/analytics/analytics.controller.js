const service = require("./analytics.service");
const { success } = require("../../utils/apiResponse");

const getOverview = async (req, res, next) => {
  try {
    const data = await service.getOverview();
    return success(res, data, "Overview fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getReportsAnalytics = async (req, res, next) => {
  try {
    const data = await service.getReportsAnalytics(req.query);
    return success(res, data, "Reports analytics fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getTrucksAnalytics = async (req, res, next) => {
  try {
    const data = await service.getTrucksAnalytics();
    return success(res, data, "Trucks analytics fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getUsersAnalytics = async (req, res, next) => {
  try {
    const data = await service.getUsersAnalytics();
    return success(res, data, "Users analytics fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getPostsAnalytics = async (req, res, next) => {
  try {
    const data = await service.getPostsAnalytics();
    return success(res, data, "Posts analytics fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getBarangaysAnalytics = async (req, res, next) => {
  try {
    const data = await service.getBarangaysAnalytics();
    return success(res, data, "Barangays analytics fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getReportsAnalytics,
  getTrucksAnalytics,
  getUsersAnalytics,
  getPostsAnalytics,
  getBarangaysAnalytics,
};
