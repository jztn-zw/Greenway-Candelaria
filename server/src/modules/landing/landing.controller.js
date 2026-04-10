const service = require("./landing.service");
const {
  updateSectionSchema,
  toggleVisibilitySchema,
} = require("./landing.schema");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const sections = await service.getAll();
    return success(res, sections, "Landing content fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getBySection = async (req, res, next) => {
  try {
    const section = await service.getBySection(req.params.section);
    return success(res, section, "Section fetched successfully");
  } catch (err) {
    next(err);
  }
};

const updateSection = async (req, res, next) => {
  try {
    const { content } = updateSectionSchema.parse(req.body);
    const section = await service.updateSection(
      req.params.section,
      content,
      req.user.id,
      req.ip,
    );
    return success(res, section, "Section updated successfully");
  } catch (err) {
    next(err);
  }
};

const toggleVisibility = async (req, res, next) => {
  try {
    const { is_visible } = toggleVisibilitySchema.parse(req.body);
    const section = await service.toggleVisibility(
      req.params.section,
      is_visible,
      req.user.id,
      req.ip,
    );
    return success(res, section, "Section visibility updated");
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await service.getHistory(req.params.section);
    return success(res, history, "Section history fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getBySection,
  updateSection,
  toggleVisibility,
  getHistory,
};
