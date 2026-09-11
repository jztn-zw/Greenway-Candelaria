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

const recordExport = async (req, res, next) => {
  try {
    await service.log({
      user_id: req.user.id,
      action: "EXPORT_AUDIT_LOGS",
      module: "audit",
      ip_address: req.ip,
      new_value: {
        module_filter: typeof req.body?.module === "string" ? req.body.module : "all",
        from: typeof req.body?.from === "string" ? req.body.from : null,
        to: typeof req.body?.to === "string" ? req.body.to : null,
        entry_count: Number.isFinite(req.body?.entry_count) ? req.body.entry_count : 0,
        request_id: req.requestId,
      },
    });
    return success(res, null, "Audit export recorded");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getFilterOptions, recordExport };
