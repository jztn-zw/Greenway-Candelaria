const service = require("./reports.service");
const {
  createReportSchema,
  updateStatusSchema,
  addNoteSchema,
  flagReportSchema,
  updatePrioritySchema,
} = require("./reports.schema");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const reports = await service.getAll(req.query);
    return success(res, reports, "Reports fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const report = await service.getById(req.params.id);
    return success(res, report, "Report fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getMyReports = async (req, res, next) => {
  try {
    const reports = await service.getMyReports(req.user.id);
    return success(res, reports, "Your reports fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createReportSchema.parse(req.body);
    const report = await service.create(req.user.id, data);
    return success(res, report, "Report submitted successfully", 201);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = updateStatusSchema.parse(req.body);
    const report = await service.updateStatus(req.params.id, req.user.id, data);
    return success(res, report, "Report status updated");
  } catch (err) {
    next(err);
  }
};

const flagReport = async (req, res, next) => {
  try {
    const data = flagReportSchema.parse(req.body);
    const report = await service.flagReport(req.params.id, data);
    return success(res, report, "Report flagged successfully");
  } catch (err) {
    next(err);
  }
};

const updatePriority = async (req, res, next) => {
  try {
    const { priority } = updatePrioritySchema.parse(req.body);
    const report = await service.updatePriority(req.params.id, priority);
    return success(res, report, "Priority updated successfully");
  } catch (err) {
    next(err);
  }
};

const addNote = async (req, res, next) => {
  try {
    const { note } = addNoteSchema.parse(req.body);
    const result = await service.addNote(req.params.id, req.user.id, note);
    return success(res, result, "Note added successfully", 201);
  } catch (err) {
    next(err);
  }
};

const getNotes = async (req, res, next) => {
  try {
    const notes = await service.getNotes(req.params.id);
    return success(res, notes, "Notes fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getStatusHistory = async (req, res, next) => {
  try {
    const history = await service.getStatusHistory(req.params.id);
    return success(res, history, "Status history fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  getMyReports,
  create,
  updateStatus,
  flagReport,
  updatePriority,
  addNote,
  getNotes,
  getStatusHistory,
};
