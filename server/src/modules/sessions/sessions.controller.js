const service = require("./sessions.service");
const { success } = require("../../utils/apiResponse");

const getMySessions = async (req, res, next) => {
  try {
    const sessions = await service.getMySessions(req.user.id);
    return success(res, sessions, "Sessions fetched successfully");
  } catch (err) {
    next(err);
  }
};

const deleteOne = async (req, res, next) => {
  try {
    await service.deleteOne(req.params.id, req.user.id);
    return success(res, null, "Session logged out successfully");
  } catch (err) {
    next(err);
  }
};

const deleteAll = async (req, res, next) => {
  try {
    await service.deleteAll(req.user.id, req.token);
    return success(res, null, "All other devices logged out successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { getMySessions, deleteOne, deleteAll };
