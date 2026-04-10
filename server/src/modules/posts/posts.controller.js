const service = require("./posts.service");
const { upload } = require("../../config/cloudinary");
const {
  createPostSchema,
  updatePostSchema,
  addCommentSchema,
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
    const ip = req.ip || req.headers["x-forwarded-for"]; // Support proxies
    const post = await service.getById(req.params.id, userId);

    // Pass both for the unique check
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

const addComment = async (req, res, next) => {
  try {
    const { body, parent_id } = addCommentSchema.parse(req.body);
    const comment = await service.addComment(
      req.params.id,
      req.user.id,
      body,
      parent_id ?? null,
    );
    return success(res, comment, "Comment added", 201);
  } catch (err) {
    next(err);
  }
};

const getComments = async (req, res, next) => {
  try {
    const comments = await service.getComments(req.params.id);
    return success(res, comments, "Comments fetched successfully");
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const result = await service.deleteComment(
      req.params.id,
      req.params.commentId,
      req.user.id,
      req.user.role,
    );
    return success(res, result, "Comment deleted");
  } catch (err) {
    next(err);
  }
};

const bookmarkPost = async (req, res, next) => {
  try {
    const result = await service.bookmarkPost(req.params.id, req.user.id);
    return success(res, result, "Post bookmarked");
  } catch (err) {
    next(err);
  }
};

const unbookmarkPost = async (req, res, next) => {
  try {
    const result = await service.unbookmarkPost(req.params.id, req.user.id);
    return success(res, result, "Bookmark removed");
  } catch (err) {
    next(err);
  }
};

const getBookmarks = async (req, res, next) => {
  try {
    const posts = await service.getBookmarks(req.user.id);
    return success(res, posts, "Bookmarks fetched successfully");
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
  likePost,
  unlikePost,
  addComment,
  getComments,
  deleteComment,
  bookmarkPost,
  unbookmarkPost,
  getBookmarks,
  uploadImage,
};
