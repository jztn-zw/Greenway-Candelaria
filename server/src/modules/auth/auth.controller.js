const authService = require("./auth.service");
const { registerSchema, loginSchema } = require("./auth.schema");
const { success, error } = require("../../utils/apiResponse");
const {
  broadcastLiveUpdate,
  broadcastRouteUpdate,
} = require("../../sockets/tracking.socket");

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data);
    return success(res, user, "Account created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data, req);
    return success(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.token, req.user?.id);

    const io = req.app.get("io");
    broadcastLiveUpdate(io);
    broadcastRouteUpdate(io, {
      type: "driver-logout",
      userId: req.user?.id ?? null,
    });

    return success(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return success(res, user, "User fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getMe };

