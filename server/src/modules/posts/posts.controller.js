const service = require("./posts.service");
const { upload } = require("../../config/cloudinary");
const {
  createPostSchema,
  updatePostSchema,
} = require("./posts.schema");
const { success } = require("../../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const posts = await service.getAll(req.query, userId);
    return success(res, posts, "Posts fetched successfully");
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || null;
    const ip = req.ip || req.headers["x-forwarded-for"] || "0.0.0.0";
    const post = await service.getById(req.params.id, userId, userRole);
    // Only count a view after access has been authorized. This prevents hidden
    // drafts and archived posts from gaining views through direct URL requests.
    await service.incrementView(req.params.id, userId, ip);

    return success(res, post, "Post fetched successfully");
  } catch (err) {
    next(err);
  }
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    return success(res, { url: req.file.path }, "Image uploaded", 201);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = createPostSchema.parse(req.body);
    const post = await service.create(req.user.id, data);
    return success(res, post, "Post created successfully", 201);
  } catch (err) {
    next(err);
  }
};

const duplicate = async (req, res, next) => {
  try {
    const post = await service.duplicate(req.params.id, req.user.id);
    return success(res, post, "Post duplicated as draft", 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = updatePostSchema.parse(req.body);
    const post = await service.update(req.params.id, data);
    return success(res, post, "Post updated successfully");
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.remove(req.params.id);
    return success(res, result, "Post deleted successfully");
  } catch (err) {
    next(err);
  }
};

const likePost = async (req, res, next) => {
  try {
    const result = await service.likePost(req.params.id, req.user.id);
    return success(res, result, "Post liked");
  } catch (err) {
    next(err);
  }
};

const unlikePost = async (req, res, next) => {
  try {
    const result = await service.unlikePost(req.params.id, req.user.id);
    return success(res, result, "Post unliked");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  duplicate,
  update,
  remove,
  likePost,
  unlikePost,
  uploadImage,
};
