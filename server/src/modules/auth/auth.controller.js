const authService = require("./auth.service");
const { registerSchema, residentSetupSchema, loginSchema, recoverySchema, recoveryCodeSchema, accountDeletionSchema } = require("./auth.schema");
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

const recoverPassword = async (req, res, next) => {
  try { return success(res, await authService.recoverPassword(recoverySchema.parse(req.body)), "Password reset. Log in with your new password."); }
  catch (err) { next(err); }
};
const replaceRecoveryCode = async (req, res, next) => {
  try { return success(res, await authService.replaceRecoveryCode(req.user.id, recoveryCodeSchema.parse(req.body).password)); }
  catch (err) { next(err); }
};

const completeResidentProfile = async (req, res, next) => {
  try {
    return success(res, await authService.completeResidentProfile(req.user.id, residentSetupSchema.parse(req.body)), "Resident profile completed");
  } catch (err) { next(err); }
};
const deleteResident = async (req, res, next) => {
  try {
    const { password } = accountDeletionSchema.parse(req.body);
    return success(res, await authService.deleteResident(req.user.id, password, req.token, req.ip), "Account deleted");
  } catch (error) { next(error); }
};
module.exports = { register, login, logout, getMe, recoverPassword, replaceRecoveryCode, completeResidentProfile, deleteResident };

