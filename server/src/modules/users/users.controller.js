const service = require("./users.service");
const {
  updateProfileSchema,
  changePasswordSchema,
  updateStatusSchema,
} = require("./users.schema");
const { success } = require("../../utils/apiResponse");

const getProfile = async (req, res, next) => {
  try {
    const user = await service.getProfile(req.user.id);
    return success(res, user, "Profile fetched successfully");
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await service.updateProfile(req.user.id, data);
    return success(res, user, "Profile updated successfully");
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    await service.changePassword(req.user.id, data);
    return success(
      res,
      null,
      "Password changed successfully. Please login again.",
    );
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { search, barangay_id, status, page, limit } = req.query;
    const result = await service.getAll({
      search,
      barangay_id,
      status,
      page,
      limit,
    });
    return success(res, result, "Users fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    return success(res, user, "User fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Pass adminId + ip down to service
const updateStatus = async (req, res, next) => {
  try {
    const data = updateStatusSchema.parse(req.body);
    const user = await service.updateStatus(
      req.params.id, // target user
      data, // { status, ban_reason }
      req.user.id, // who did it
      req.ip, // their IP
    );
    return success(res, user, "User status updated successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Pass adminId + ip down to service
const softDelete = async (req, res, next) => {
  try {
    const result = await service.softDelete(
      req.params.id, // target user
      req.user.id, // who did it
      req.ip, // their IP
    );
    return success(res, result, "User deleted successfully");
  } catch (err) {
    next(err);
  }
};

const getReportHistory = async (req, res, next) => {
  try {
    const reports = await service.getReportHistory(req.params.id);
    return success(res, reports, "Report history fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAll,
  getById,
  updateStatus,
  softDelete,
  getReportHistory,
};
