const { emitAdminDataChanged } = require("../../sockets/adminChanges.socket");
const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const { notifyAllResidents } = require("../notifications/notifications.service");
const auditService = require("../audit/audit.service");
const { deleteCloudinaryImage } = require("../../config/cloudinary");

const MAX_POST_IMAGES = 5;

const normalizeTags = (tags = []) =>
  [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];

const buildPostNotification = (post) => ({
  type: "NEW_POST",
  title: "New Community Post",
  body: `"${post.title}" is now available in Community Posts.`,
  ref_id: post.id,
  ref_module: "posts",
  metadata: { category: post.category },
});

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
       SET published_at = COALESCE(scheduled_at, NOW()),
           scheduled_at = NULL,
           status = 'PUBLISHED'
       WHERE id = ? AND status = 'SCHEDULED'`,
      [post.id],
    );

    if (result.affectedRows === 1) {
      emitAdminDataChanged(["posts", "dashboard", "analytics"]);
      notifyAllResidents(buildPostNotification(post)).catch((err) =>
        console.error("[Notify] ❌ Scheduled post notification failed:", err.message),
      );
    }
  }
};

const getAll = async (filters = {}, userId = null, userRole = null) => {
  // Auto-activate due posts and notify residents exactly once per post.
  await publishDueScheduledPosts().catch((err) =>
    console.error("[Posts] ❌ Failed to publish due scheduled posts:", err.message),
  );

  const params = [];
  const whereParams = [];
  const conditions = ["p.deleted_at IS NULL"];
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
       ${isLikedField}
    FROM posts p
    LEFT JOIN users u ON u.id = p.created_by
  `;

  if (filters.category) {
    conditions.push("p.category = ?");
    whereParams.push(filters.category);
  }

  const isAdmin = userRole === "ADMIN";

  if (!isAdmin) {
    // Never trust public query parameters to decide visibility. Draft,
    // scheduled, and archived content is visible only to an administrator.
    conditions.push("p.status = 'PUBLISHED'");
  } else if (filters.status) {
    conditions.push("p.status = ?");
    whereParams.push(filters.status);
  } else if (!filters.all) {
    conditions.push("p.status = 'PUBLISHED'");
  }

  if (filters.is_featured !== undefined && filters.is_featured !== "") {
    const isFeat =
      filters.is_featured === true ||
      filters.is_featured === "true" ||
      filters.is_featured === 1 ||
      filters.is_featured === "1";
    conditions.push("p.is_featured = ?");
    whereParams.push(isFeat ? 1 : 0);
  }

  if (filters.tag) {
    conditions.push(
      "EXISTS (SELECT 1 FROM post_tags WHERE post_id = p.id AND tag = ?)",
    );
    whereParams.push(filters.tag);
  }

  if (filters.search) {
    conditions.push(`(
      p.title LIKE ? OR p.body LIKE ? OR p.source LIKE ? OR u.full_name LIKE ? OR
      EXISTS (SELECT 1 FROM post_tags search_tags WHERE search_tags.post_id = p.id AND search_tags.tag LIKE ?)
    )`);
    const s = `%${filters.search}%`;
    whereParams.push(s, s, s, s, s);
  }

  const usePagination = filters.page !== undefined || filters.limit !== undefined;
  const requestedPage = Number.parseInt(filters.page, 10);
  const requestedLimit = Number.parseInt(filters.limit, 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, requestedLimit))
    : 10;
  const sortOrder = filters.sort === "oldest"
    ? "COALESCE(p.published_at, p.created_at) ASC"
    : filters.sort === "most-reacted"
      ? "like_count DESC, COALESCE(p.published_at, p.created_at) DESC"
      : filters.sort === "views"
        ? "p.view_count DESC, COALESCE(p.published_at, p.created_at) DESC"
        : "p.is_featured DESC, COALESCE(p.published_at, p.created_at) DESC";

  query += ` WHERE ${conditions.join(" AND ")} ORDER BY ${sortOrder}`;
  params.push(...whereParams);

  if (usePagination) {
    query += " LIMIT ? OFFSET ?";
    params.push(limit, (page - 1) * limit);
  }

  const [rows] = await pool.query(query, params);

  const postIds = rows.map((post) => post.id);
  const imagesByPost = new Map();
  const tagsByPost = new Map();

  if (postIds.length > 0) {
    const placeholders = postIds.map(() => "?").join(",");
    const [imageRows] = await pool.query(
      `SELECT post_id, url FROM post_images WHERE post_id IN (${placeholders}) ORDER BY post_id, stop_order ASC`,
      postIds,
    );
    const [tagRows] = await pool.query(
      `SELECT post_id, tag FROM post_tags WHERE post_id IN (${placeholders}) ORDER BY post_id, created_at ASC`,
      postIds,
    );
    for (const image of imageRows) {
      imagesByPost.set(image.post_id, [...(imagesByPost.get(image.post_id) || []), image.url]);
    }
    for (const tag of tagRows) {
      tagsByPost.set(tag.post_id, [...(tagsByPost.get(tag.post_id) || []), tag.tag]);
    }
  }

  const posts = rows.map((post) => ({
    ...post,
    is_liked: Boolean(post.is_liked),
    images: imagesByPost.get(post.id) || [],
    tags: tagsByPost.get(post.id) || [],
  }));

  if (!usePagination) return posts;

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM posts p
       LEFT JOIN users u ON u.id = p.created_by
      WHERE ${conditions.join(" AND ")}`,
    whereParams,
  );
  const total = Number(countRow.total || 0);

  let stats;
  if (isAdmin) {
    const [[statsRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total_posts,
         SUM(status = 'PUBLISHED') AS published,
         SUM(status = 'DRAFT') AS drafts,
         SUM(status = 'SCHEDULED') AS scheduled,
         SUM(status = 'ARCHIVED') AS archived,
         COALESCE(SUM(CASE WHEN status = 'PUBLISHED' THEN view_count ELSE 0 END), 0) AS total_views,
         (SELECT COUNT(*)
            FROM post_likes pl
            JOIN posts liked_post ON liked_post.id = pl.post_id
           WHERE liked_post.deleted_at IS NULL
             AND liked_post.status = 'PUBLISHED') AS total_reacts
       FROM posts
       WHERE deleted_at IS NULL`,
    );
    stats = {
      totalPosts: Number(statsRow.total_posts || 0),
      published: Number(statsRow.published || 0),
      drafts: Number(statsRow.drafts || 0),
      scheduled: Number(statsRow.scheduled || 0),
      archived: Number(statsRow.archived || 0),
      totalViews: Number(statsRow.total_views || 0),
      totalReacts: Number(statsRow.total_reacts || 0),
    };
  }

  return {
    posts,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    ...(stats ? { stats } : {}),
  };
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

  if (images.length > MAX_POST_IMAGES) {
    throw { statusCode: 400, message: `A post can contain up to ${MAX_POST_IMAGES} images` };
  }

  const postId = generateId();
  const publishedAt = status === "PUBLISHED" ? new Date() : null;
  const normalizedTags = normalizeTags(tags);

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
        toUtcDatabaseDateTime(status === "SCHEDULED" ? scheduled_at : null),
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

    if (normalizedTags.length > 0) {
      const tagRows = normalizedTags.map((tag) => [
        generateId(),
        postId,
        tag,
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
      notifyAllResidents(buildPostNotification(createdPost)).catch((err) => console.error("[Notify] ❌ Post publish notification failed:", err.message));
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

const update = async (id, data, adminId) => {
  const existing = await getById(id, null, null, true);

  if (data.images && data.images.length > MAX_POST_IMAGES) {
    throw { statusCode: 400, message: `A post can contain up to ${MAX_POST_IMAGES} images` };
  }

  const normalizedData = { ...data };
  if (normalizedData.tags) {
    normalizedData.tags = normalizeTags(normalizedData.tags);
  }
  const removedImageUrls = normalizedData.images
    ? existing.images.filter((url) => !normalizedData.images.includes(url))
    : [];
  if (normalizedData.status && normalizedData.status !== "SCHEDULED") {
    normalizedData.scheduled_at = null;
  }

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
    if (normalizedData[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(
        key === "scheduled_at"
          ? toUtcDatabaseDateTime(normalizedData[key])
          : normalizedData[key],
      );
    }
  }

  if (normalizedData.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
    fields.push("published_at = ?");
    params.push(new Date());
  } else if (
    normalizedData.status &&
    normalizedData.status !== "PUBLISHED" &&
    existing.status === "PUBLISHED"
  ) {
    fields.push("published_at = ?");
    params.push(null);
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

    if (normalizedData.images !== undefined) {
      await connection.query("DELETE FROM post_images WHERE post_id = ?", [id]);
      if (normalizedData.images.length > 0) {
        const imageRows = normalizedData.images.map((url, i) => [
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

    if (normalizedData.tags !== undefined) {
      await connection.query("DELETE FROM post_tags WHERE post_id = ?", [id]);
      if (normalizedData.tags.length > 0) {
        const tagRows = normalizedData.tags.map((tag) => [
          generateId(),
          id,
          tag,
        ]);
        await connection.query(
          "INSERT INTO post_tags (id, post_id, tag) VALUES ?",
          [tagRows],
        );
      }
    }

    await connection.commit();
    const updatedPost = await getById(id, null, null, true);

    // Duplicated posts may share an image URL. Delete the remote asset only
    // after the transaction commits and no post references it anymore.
    await Promise.allSettled(
      removedImageUrls.map(async (url) => {
        if (!(await isImageReferenced(url))) {
          await deleteCloudinaryImage(url);
        }
      }),
    );

    await auditService.log({
      user_id: adminId,
      action: normalizedData.status === "PUBLISHED" && existing.status !== "PUBLISHED" ? "PUBLISH_POST" : "UPDATE_POST",
      module: "posts",
      record_id: updatedPost.id,
      old_value: { title: existing.title, category: existing.category, status: existing.status },
      new_value: { title: updatedPost.title, category: updatedPost.category, status: updatedPost.status },
    }).catch(() => {});

    // Trigger notification if newly published
    if (normalizedData.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      notifyAllResidents(buildPostNotification(updatedPost)).catch((err) => console.error("[Notify] ❌ Post publish notification failed:", err.message));
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

const remove = async (id, adminId) => {
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
      user_id: adminId,
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
  const [existing] = userId
    ? await pool.query(
        "SELECT id FROM post_view_logs WHERE post_id = ? AND user_id = ? LIMIT 1",
        [postId, userId],
      )
    : await pool.query(
        "SELECT id FROM post_view_logs WHERE post_id = ? AND user_id IS NULL AND ip_address = ? LIMIT 1",
        [postId, ipAddress],
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

const isImageReferenced = async (url) => {
  const [[row]] = await pool.query(
    "SELECT EXISTS(SELECT 1 FROM post_images WHERE url = ?) AS referenced",
    [url],
  );
  return Boolean(row.referenced);
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
  isImageReferenced,
};
