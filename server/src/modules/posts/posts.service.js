const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const { notifyAllResidents } = require("../notifications/notifications.service");
const auditService = require("../audit/audit.service");

// Scheduled times arrive as ISO 8601 instants (for example,
// 2026-09-05T05:30:00.000Z). Store their UTC value in TiDB's timezone-less
// DATETIME column so comparison with NOW() is reliable on every host.
const toUtcDatabaseDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace("T", " ");
};

// ─── Base fetch ────────────────────────────────────────────

const getById = async (id, userId = null, userRole = null, bypassStatusCheck = false) => {
  const [rows] = await pool.query(
    `SELECT
       p.*,
       u.full_name   AS author_name,
       u.avatar_url  AS author_avatar,
       (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count
     FROM posts p
     LEFT JOIN users u ON u.id = p.created_by
     WHERE p.id = ? AND p.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Post not found" };
  }

  const post = rows[0];

  if (
    !bypassStatusCheck &&
    post.status !== "PUBLISHED" &&
    userRole !== "ADMIN" &&
    post.created_by !== userId
  ) {
    throw { statusCode: 404, message: "Post not found" };
  }

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

  } else {
    post.is_liked = false;
  }

  return post;
};

// ─── Get All (Optimized) ───────────────────────────────────

const publishDueScheduledPosts = async () => {
  const [duePosts] = await pool.query(
    `SELECT id, title, category
     FROM posts
     WHERE status = 'SCHEDULED'
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= NOW()
       AND deleted_at IS NULL`,
  );

  for (const post of duePosts) {
    // The status condition makes this safe if two requests reach this code at once:
    // only the request that actually publishes the post sends the notification.
    const [result] = await pool.query(
      `UPDATE posts
       SET status = 'PUBLISHED', published_at = COALESCE(scheduled_at, NOW())
       WHERE id = ? AND status = 'SCHEDULED'`,
      [post.id],
    );

    if (result.affectedRows === 1) {
      notifyAllResidents({
        type: "NEW_POST",
        title: `New Content: ${post.title}`,
        body: "A new item is available in Contents.",
        ref_id: post.id,
        ref_module: "posts",
        metadata: { category: post.category },
      }).catch((err) =>
        console.error("[Notify] ❌ Scheduled post notification failed:", err.message),
      );
    }
  }
};

const getAll = async (filters = {}, userId = null) => {
  // Auto-activate due posts and notify residents exactly once per post.
  await publishDueScheduledPosts().catch((err) =>
    console.error("[Posts] ❌ Failed to publish due scheduled posts:", err.message),
  );

  const params = [];
  let isLikedField = "FALSE AS is_liked";
  if (userId) {
    isLikedField = "EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) AS is_liked";
    params.push(userId);
  }

  let query = `
    SELECT
      p.id,
      p.title,
      p.body,
      p.source,
      p.category,
      p.status,
      p.is_featured,
      p.view_count,
      p.scheduled_at,
      p.published_at,
      p.created_at,
      p.updated_at,
      u.full_name  AS author_name,
      u.avatar_url AS author_avatar,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
      ${isLikedField},
      (SELECT GROUP_CONCAT(url ORDER BY stop_order ASC) FROM post_images WHERE post_id = p.id) AS image_list,
      (SELECT GROUP_CONCAT(tag) FROM post_tags WHERE post_id = p.id) AS tag_list
    FROM posts p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.deleted_at IS NULL
  `;

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

  if (filters.is_featured !== undefined && filters.is_featured !== "") {
    const isFeat =
      filters.is_featured === true ||
      filters.is_featured === "true" ||
      filters.is_featured === 1 ||
      filters.is_featured === "1";
    query += " AND p.is_featured = ?";
    params.push(isFeat ? 1 : 0);
  }

  if (filters.tag) {
    query +=
      " AND EXISTS (SELECT 1 FROM post_tags WHERE post_id = p.id AND tag = ?)";
    params.push(filters.tag);
  }

  if (filters.search) {
    query += " AND (p.title LIKE ? OR p.body LIKE ? OR p.source LIKE ?)";
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  query += " ORDER BY p.is_featured DESC, COALESCE(p.published_at, p.created_at) DESC";

  const [rows] = await pool.query(query, params);

  return rows.map((post) => ({
    ...post,
    is_liked: Boolean(post.is_liked),
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
        toUtcDatabaseDateTime(scheduled_at),
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
    const createdPost = await getById(postId, adminId, "ADMIN", true);

    await auditService.log({
      user_id: adminId,
      action: createdPost.status === "PUBLISHED" ? "PUBLISH_POST" : "CREATE_POST",
      module: "posts",
      record_id: createdPost.id,
      new_value: { title: createdPost.title, category: createdPost.category, status: createdPost.status },
    }).catch(() => {});

    if (createdPost.status === "PUBLISHED") {
      notifyAllResidents({
        type: "NEW_POST",
        title: `New Content: ${createdPost.title}`,
        body: "A new item is available in Contents.",
        ref_id: createdPost.id,
        ref_module: "posts",
        metadata: { category: createdPost.category },
      }).catch((err) => console.error("[Notify] ❌ Post publish notification failed:", err.message));
    }

    return createdPost;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Duplicate ─────────────────────────────────────────────

const duplicate = async (postId, adminId) => {
  const original = await getById(postId, null, null, true);
  const copySuffix = " (Copy)";
  const title = `${original.title.slice(0, 255 - copySuffix.length)}${copySuffix}`;

  // Create through the normal path so images, tags, audit history, and all
  // future post rules stay consistent. A duplicate is deliberately a draft:
  // it never publishes or sends a resident notification automatically.
  return create(adminId, {
    title,
    body: original.body,
    source: original.source,
    category: original.category,
    status: "DRAFT",
    is_featured: false,
    scheduled_at: null,
    images: original.images,
    tags: original.tags,
  });
};

// ─── Update ────────────────────────────────────────────────

const update = async (id, data) => {
  const existing = await getById(id, null, null, true);

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
      params.push(
        key === "scheduled_at"
          ? toUtcDatabaseDateTime(data[key])
          : data[key],
      );
    }
  }

  if (data.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
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
    const updatedPost = await getById(id, null, null, true);

    await auditService.log({
      user_id: updatedPost.created_by,
      action: data.status === "PUBLISHED" && existing.status !== "PUBLISHED" ? "PUBLISH_POST" : "UPDATE_POST",
      module: "posts",
      record_id: updatedPost.id,
      old_value: { title: existing.title, category: existing.category, status: existing.status },
      new_value: { title: updatedPost.title, category: updatedPost.category, status: updatedPost.status },
    }).catch(() => {});

    // Trigger notification if newly published
    if (data.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      notifyAllResidents({
        type: "NEW_POST",
        title: `New Content: ${updatedPost.title}`,
        body: "A new item is available in Contents.",
        ref_id: updatedPost.id,
        ref_module: "posts",
        metadata: { category: updatedPost.category },
      }).catch((err) => console.error("[Notify] ❌ Post publish notification failed:", err.message));
    }

    return updatedPost;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Soft delete ───────────────────────────────────────────

const remove = async (id) => {
  const existing = await getById(id, null, null, true).catch(() => null);
  const [result] = await pool.query(
    "UPDATE posts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  if (result.affectedRows === 0) {
    throw { statusCode: 404, message: "Post not found or already deleted" };
  }

  if (existing) {
    await auditService.log({
      user_id: existing.created_by,
      action: "DELETE_POST",
      module: "posts",
      record_id: id,
      old_value: { title: existing.title, category: existing.category, status: existing.status },
    }).catch(() => {});
  }

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

module.exports = {
  publishDueScheduledPosts,
  getAll,
  getById,
  create,
  duplicate,
  update,
  remove,
  incrementView,
  likePost,
  unlikePost,
};
