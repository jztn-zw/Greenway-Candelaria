const service = require("./dashboard.service");
const { success } = require("../../utils/apiResponse");

const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await service.getAdminDashboard();
    return success(res, data, "Dashboard fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminDashboard };
