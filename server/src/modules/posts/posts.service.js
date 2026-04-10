const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

// ─── Base fetch ────────────────────────────────────────────

const getById = async (id, userId = null) => {
  const [rows] = await pool.query(
    `SELECT
       p.*,
       u.full_name   AS author_name,
       u.avatar_url  AS author_avatar,
       (SELECT COUNT(*) FROM post_likes     WHERE post_id = p.id) AS like_count,
       (SELECT COUNT(*) FROM post_comments  WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count,
       (SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id) AS bookmark_count
     FROM posts p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ? AND p.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Post not found" };
  }

  const post = rows[0];

  // Attach images
  const [imageRows] = await pool.query(
    "SELECT url FROM post_images WHERE post_id = ? ORDER BY stop_order ASC",
    [id],
  );
  post.images = imageRows.map((img) => img.url);

  // Attach tags
  const [tags] = await pool.query(
    "SELECT tag FROM post_tags WHERE post_id = ?",
    [id],
  );
  post.tags = tags.map((t) => t.tag);

  if (userId) {
    const [liked] = await pool.query(
      "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
      [id, userId],
    );
    post.is_liked = liked.length > 0;

    const [bookmarked] = await pool.query(
      "SELECT id FROM post_bookmarks WHERE post_id = ? AND user_id = ?",
      [id, userId],
    );
    post.is_bookmarked = bookmarked.length > 0;
  }

  return post;
};

// ─── Get All (Optimized) ───────────────────────────────────

const getAll = async (filters = {}, userId = null) => {
  let query = `
    SELECT
      p.*,
      u.full_name  AS author_name,
      u.avatar_url AS author_avatar,
      (SELECT COUNT(*) FROM post_likes     WHERE post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM post_comments  WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count,
      (SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id) AS bookmark_count,
      (SELECT GROUP_CONCAT(url ORDER BY stop_order ASC) FROM post_images WHERE post_id = p.id) AS image_list,
      (SELECT GROUP_CONCAT(tag) FROM post_tags WHERE post_id = p.id) AS tag_list
    FROM posts p
    JOIN users u ON u.id = p.created_by
    WHERE p.deleted_at IS NULL
  `;

  const params = [];
  if (filters.category) {
    query += " AND p.category = ?";
    params.push(filters.category);
  }

  if (filters.status) {
    query += " AND p.status = ?";
    params.push(filters.status);
  } else if (!filters.all) {
    query += " AND p.status = 'PUBLISHED'";
  }

  if (filters.is_featured) {
    query += " AND p.is_featured = TRUE";
  }

  if (filters.tag) {
    query +=
      " AND EXISTS (SELECT 1 FROM post_tags WHERE post_id = p.id AND tag = ?)";
    params.push(filters.tag);
  }

  query += " ORDER BY p.created_at DESC";

  const [rows] = await pool.query(query, params);

  return rows.map((post) => ({
    ...post,
    images: post.image_list ? post.image_list.split(",") : [],
    tags: post.tag_list ? post.tag_list.split(",") : [],
  }));
};

// ─── Create ────────────────────────────────────────────────

const create = async (adminId, data) => {
  const {
    title,
    body,
    source,
    category,
    status,
    is_featured,
    scheduled_at,
    images = [],
    tags = [],
  } = data;

  const postId = generateId();
  const publishedAt = status === "PUBLISHED" ? new Date() : null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO posts 
        (id, title, body, source, category, status, is_featured, 
         scheduled_at, published_at, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId,
        title,
        body,
        source || null,
        category,
        status,
        is_featured,
        scheduled_at || null,
        publishedAt,
        adminId,
      ],
    );

    if (images.length > 0) {
      const imageRows = images.map((url, i) => [generateId(), postId, url, i]);
      await connection.query(
        "INSERT INTO post_images (id, post_id, url, stop_order) VALUES ?",
        [imageRows],
      );
    }

    if (tags.length > 0) {
      const tagRows = tags.map((tag) => [
        generateId(),
        postId,
        tag.toLowerCase(),
      ]);
      await connection.query(
        "INSERT INTO post_tags (id, post_id, tag) VALUES ?",
        [tagRows],
      );
    }

    await connection.commit();
    return getById(postId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Update ────────────────────────────────────────────────

const update = async (id, data) => {
  await getById(id);

  const fields = [];
  const params = [];
  const map = {
    title: "title",
    body: "body",
    source: "source",
    category: "category",
    status: "status",
    is_featured: "is_featured",
    scheduled_at: "scheduled_at",
  };

  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(data[key]);
    }
  }

  if (data.status === "PUBLISHED") {
    fields.push("published_at = ?");
    params.push(new Date());
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (fields.length > 0) {
      params.push(id);
      await connection.query(
        `UPDATE posts SET ${fields.join(", ")} WHERE id = ?`,
        params,
      );
    }

    if (data.images !== undefined) {
      await connection.query("DELETE FROM post_images WHERE post_id = ?", [id]);
      if (data.images.length > 0) {
        const imageRows = data.images.map((url, i) => [
          generateId(),
          id,
          url,
          i,
        ]);
        await connection.query(
          "INSERT INTO post_images (id, post_id, url, stop_order) VALUES ?",
          [imageRows],
        );
      }
    }

    if (data.tags !== undefined) {
      await connection.query("DELETE FROM post_tags WHERE post_id = ?", [id]);
      if (data.tags.length > 0) {
        const tagRows = data.tags.map((tag) => [
          generateId(),
          id,
          tag.toLowerCase(),
        ]);
        await connection.query(
          "INSERT INTO post_tags (id, post_id, tag) VALUES ?",
          [tagRows],
        );
      }
    }

    await connection.commit();
    return getById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Soft delete ───────────────────────────────────────────

const remove = async (id) => {
  await getById(id);
  await pool.query("UPDATE posts SET deleted_at = NOW() WHERE id = ?", [id]);
  return { message: "Post deleted successfully" };
};

// ─── Increment view count ──────────────────────────────────

const incrementView = async (postId, userId = null, ipAddress = "0.0.0.0") => {
  const [existing] = await pool.query(
    "SELECT id FROM post_view_logs WHERE post_id = ? AND (user_id = ? OR ip_address = ?)",
    [postId, userId, ipAddress],
  );

  if (existing.length === 0) {
    await pool.query(
      "INSERT INTO post_view_logs (id, post_id, user_id, ip_address) VALUES (?, ?, ?, ?)",
      [generateId(), postId, userId, ipAddress],
    );
    await pool.query(
      "UPDATE posts SET view_count = view_count + 1 WHERE id = ?",
      [postId],
    );
  }
};

// ─── Like / Unlike ─────────────────────────────────────────

const likePost = async (postId, userId) => {
  await getById(postId);
  const [existing] = await pool.query(
    "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
    [postId, userId],
  );

  if (existing.length > 0) {
    throw { statusCode: 409, message: "Already liked this post" };
  }

  await pool.query(
    "INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)",
    [generateId(), postId, userId],
  );

  return { liked: true };
};

const unlikePost = async (postId, userId) => {
  await getById(postId);
  await pool.query("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [
    postId,
    userId,
  ]);
  return { liked: false };
};

// ─── Comments ──────────────────────────────────────────────

const addComment = async (postId, userId, body, parentId = null) => {
  await getById(postId);
  const commentId = generateId();

  await pool.query(
    "INSERT INTO post_comments (id, post_id, user_id, body, parent_id) VALUES (?, ?, ?, ?, ?)",
    [commentId, postId, userId, body, parentId],
  );

  const [rows] = await pool.query(
    `SELECT c.*, u.full_name AS author_name, u.avatar_url AS author_avatar
     FROM post_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [commentId],
  );

  return { ...rows[0], created_at: new Date().toISOString() };
};

const getComments = async (postId) => {
  await getById(postId);
  const [rows] = await pool.query(
    `SELECT 
       c.id, 
       c.post_id, 
       c.user_id, 
       c.body, 
       c.parent_id, 
       c.created_at, 
       c.deleted_at,
       u.full_name  AS author_name, 
       u.avatar_url AS author_avatar
     FROM post_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [postId],
  );

  return rows;
};

const deleteComment = async (postId, commentId, userId, userRole) => {
  const [rows] = await pool.query(
    "SELECT * FROM post_comments WHERE id = ? AND post_id = ?",
    [commentId, postId],
  );

  if (rows.length === 0)
    throw { statusCode: 404, message: "Comment not found" };

  const comment = rows[0];
  if (
    comment.user_id !== userId &&
    !["ADMIN", "SUPER_ADMIN"].includes(userRole)
  ) {
    throw { statusCode: 403, message: "Not authorized to delete this comment" };
  }

  await pool.query(
    "UPDATE post_comments SET deleted_at = NOW() WHERE id = ? OR parent_id = ?",
    [commentId, commentId],
  );
  return { message: "Comment deleted" };
};

// ─── Bookmarks ─────────────────────────────────────────────

const bookmarkPost = async (postId, userId) => {
  await getById(postId);
  const [existing] = await pool.query(
    "SELECT id FROM post_bookmarks WHERE post_id = ? AND user_id = ?",
    [postId, userId],
  );

  if (existing.length > 0)
    throw { statusCode: 409, message: "Already bookmarked" };

  await pool.query(
    "INSERT INTO post_bookmarks (id, post_id, user_id) VALUES (?, ?, ?)",
    [generateId(), postId, userId],
  );
  return { bookmarked: true };
};

const unbookmarkPost = async (postId, userId) => {
  await getById(postId);
  await pool.query(
    "DELETE FROM post_bookmarks WHERE post_id = ? AND user_id = ?",
    [postId, userId],
  );
  return { bookmarked: false };
};

const getBookmarks = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name AS author_name, u.avatar_url AS author_avatar, pb.created_at AS bookmarked_at,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count
     FROM post_bookmarks pb
     JOIN posts p ON p.id = pb.post_id
     JOIN users u ON u.id = p.created_by
     WHERE pb.user_id = ? AND p.deleted_at IS NULL
     ORDER BY pb.created_at DESC`,
    [userId],
  );
  return rows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  incrementView,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deleteComment,
  bookmarkPost,
  unbookmarkPost,
  getBookmarks,
};
