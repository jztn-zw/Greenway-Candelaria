const service = require("./announcements.service");
const brgyService = require("../barangays/barangays.service");
const {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} = require("./announcements.schema");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const announcements = await service.getAll(req.query, req.user);
    return success(res, announcements, "Announcements fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const announcement = await service.getById(req.params.id, req.user);
    return success(res, announcement, "Announcement fetched successfully");
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createAnnouncementSchema.parse(req.body);
    const announcement = await service.create(req.user.id, data);
    return success(res, announcement, "Announcement created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updateAnnouncementSchema.parse(req.body);
    const announcement = await service.update(req.params.id, data);
    return success(res, announcement, "Announcement updated successfully");
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id);
    return success(res, result, "Announcement deleted successfully");
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await service.markAsRead(req.params.id, req.user);
    return success(res, result, "Marked as read");
  } catch (err) {
    next(err);
  }
};

const getReceipts = async (req, res, next) => {
  try {
    const receipts = await service.getReceipts(req.params.id);
    return success(res, receipts, "Read receipts fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getBarangayList = async (req, res, next) => {
  try {
    // Reuse your existing barangay module's getAll logic
    const barangays = await brgyService.getAll({});

    // Map the results to only what the frontend needs
    const list = barangays.map((b) => ({
      id: b.id,
      name: b.name,
    }));

    return success(res, list, "Barangay list fetched successfully");
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  markAsRead,
  getReceipts,
  getBarangayList,
};
