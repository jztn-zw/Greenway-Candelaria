const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  sendToUser,
  notifyAdmins,
} = require("../notifications/notifications.service");
const auditService = require("../audit/audit.service");

// ─── Generate RPT-YYYY-NNNNN (atomic, year-resetting) ──────

const generateSequentialRef = async (conn) => {
  const year = new Date().getFullYear();

  // Atomic increment — safe for concurrent submissions
  await conn.query(
    "INSERT INTO report_year_counters (year, counter) VALUES (?, 1) " +
    "ON DUPLICATE KEY UPDATE counter = counter + 1",
    [year],
  );

  const [[row]] = await conn.query(
    "SELECT counter FROM report_year_counters WHERE year = ?",
    [year],
  );

  const seq = String(row.counter).padStart(5, "0");
  return `RPT-${year}-${seq}`;
};

// ─── Get single report by ID ───────────────────────────────

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       r.*,
       b.name        AS barangay_name,
       NULL          AS barangay_zone,
       u.full_name   AS reporter_name,
       u.email       AS reporter_email,
       original.reference_number AS duplicate_of_reference
     FROM reports r
     JOIN  barangays b ON b.id = r.barangay_id
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN reports original ON original.id = r.duplicate_of_id
     WHERE r.id = ? AND r.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Report not found" };
  }

  const report = rows[0];

  // Attach photos
  const [photos] = await pool.query(
    "SELECT * FROM report_photos WHERE report_id = ? ORDER BY created_at ASC",
    [id],
  );
  report.photos = photos;

  // Attach status history with user names
  const [statusHistory] = await pool.query(
    `SELECT h.*, u.full_name AS changed_by_name
     FROM report_status_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.report_id = ?
     ORDER BY h.created_at ASC`,
    [id],
  );
  report.status_history = statusHistory;

  // Attach internal notes with user names
  const [notes] = await pool.query(
    `SELECT n.*, u.full_name AS created_by_name
     FROM report_notes n
     LEFT JOIN users u ON u.id = n.created_by
     WHERE n.report_id = ?
     ORDER BY n.created_at ASC`,
    [id],
  );
  report.internal_notes = notes;

  return report;
};

// ─── Get All (admin) ───────────────────────────────────────

const getAll = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 10));
  const offset = (page - 1) * limit;

  let query = `
    SELECT
      r.*,
      b.name      AS barangay_name,
      NULL        AS barangay_zone,
      u.full_name AS reporter_name,
      u.email     AS reporter_email,
      original.reference_number AS duplicate_of_reference
    FROM reports r
    JOIN  barangays b ON b.id = r.barangay_id
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN reports original ON original.id = r.duplicate_of_id
  `;

  const params = [];
  const where = ["r.deleted_at IS NULL"];

  // Search
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      "(r.reference_number LIKE ? OR r.description LIKE ? OR b.name LIKE ? OR r.landmark LIKE ? OR u.full_name LIKE ?)"
    );
    params.push(term, term, term, term, term);
  }

  // Status
  if (filters.status && filters.status !== "all") {
    where.push("r.status = ?");
    params.push(filters.status.toUpperCase());
  }

  // Priority
  if (filters.priority && filters.priority !== "all") {
    where.push("r.priority = ?");
    params.push(filters.priority.toUpperCase());
  }

  // Barangay (id or name)
  if (filters.barangay_id && filters.barangay_id !== "all") {
    where.push("r.barangay_id = ?");
    params.push(filters.barangay_id);
  } else if (filters.barangay && filters.barangay !== "all") {
    where.push("b.name = ?");
    params.push(filters.barangay);
  }

  // Violation type
  if (filters.violation_type && filters.violation_type !== "all") {
    where.push("r.violation_type = ?");
    params.push(filters.violation_type.toUpperCase());
  }

  // Date range
  if (filters.date_from) {
    where.push("r.created_at >= ?");
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    where.push("r.created_at <= ?");
    params.push(filters.date_to);
  }

  const whereClause = where.length > 0 ? " WHERE " + where.join(" AND ") : "";

  // Sort
  let orderBy = "ORDER BY r.created_at DESC";
  if (filters.sort === "date-asc") {
    orderBy = "ORDER BY r.created_at ASC";
  } else if (filters.sort === "status") {
    orderBy = `ORDER BY FIELD(r.status, 'SUBMITTED', 'UNDER_REVIEW', 'DISPATCHED', 'RESOLVED') ASC, r.created_at DESC`;
  } else if (filters.sort === "violation") {
    orderBy = "ORDER BY r.violation_type ASC, r.created_at DESC";
  } else if (filters.sort === "priority") {
    orderBy = `ORDER BY FIELD(r.priority, 'HIGH', 'MEDIUM', 'LOW') ASC, r.created_at DESC`;
  }

  // Count total matching rows
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     LEFT JOIN users u ON u.id = r.user_id
     ${whereClause}`,
    params,
  );
  const total = countRows[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Overall database KPIs (aggregate)
  const [kpiRows] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) AS submitted,
      SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) AS under_review,
      SUM(CASE WHEN status = 'DISPATCHED' THEN 1 ELSE 0 END) AS dispatched,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved
    FROM reports
    WHERE deleted_at IS NULL
  `);

  const kpis = {
    total: Number(kpiRows[0]?.total || 0),
    submitted: Number(kpiRows[0]?.submitted || 0),
    under_review: Number(kpiRows[0]?.under_review || 0),
    dispatched: Number(kpiRows[0]?.dispatched || 0),
    resolved: Number(kpiRows[0]?.resolved || 0),
    pending: Number(kpiRows[0]?.submitted || 0) + Number(kpiRows[0]?.under_review || 0),
  };

  // Fetch page of reports
  const [reports] = await pool.query(
    `${query} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // Attach photos to each (batched)
  const reportIds = reports.map((r) => r.id);
  if (reportIds.length > 0) {
    const [allPhotos] = await pool.query(
      "SELECT * FROM report_photos WHERE report_id IN (?) ORDER BY created_at ASC",
      [reportIds],
    );
    const photosByReport = {};
    for (const p of allPhotos) {
      if (!photosByReport[p.report_id]) photosByReport[p.report_id] = [];
      photosByReport[p.report_id].push(p);
    }
    for (const report of reports) {
      report.photos = photosByReport[report.id] || [];
    }
  } else {
    for (const report of reports) report.photos = [];
  }

  return { reports, total, page, limit, totalPages, kpis };
};

// ─── Get My Reports (resident) — paginated + filtered ─────

const getMyReports = async (userId, filters = {}) => {
  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit) || 10));
  const offset = (page - 1) * limit;

  const where  = ["r.user_id = ?", "r.deleted_at IS NULL"];
  const params = [userId];

  // Status filter (backend enum: SUBMITTED, UNDER_REVIEW, DISPATCHED, RESOLVED)
  if (filters.status && filters.status !== "all") {
    where.push("r.status = ?");
    params.push(filters.status.toUpperCase());
  }

  // Search — reference number or description
  if (filters.search && filters.search.trim() !== "") {
    where.push("(r.reference_number LIKE ? OR r.description LIKE ?)");
    const term = "%" + filters.search.trim() + "%";
    params.push(term, term);
  }

  const whereClause = "WHERE " + where.join(" AND ");
  const order = filters.sort === "oldest" ? "ASC" : "DESC";

  // Count total matching rows
  const [countRows] = await pool.query(
    "SELECT COUNT(*) AS total FROM reports r " + whereClause,
    params,
  );
  const total      = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  // Fetch page of reports
  const [reports] = await pool.query(
    "SELECT r.*, b.name AS barangay_name, NULL AS barangay_zone " +
    "FROM reports r " +
    "JOIN barangays b ON b.id = r.barangay_id " +
    whereClause +
    " ORDER BY r.created_at " + order +
    " LIMIT ? OFFSET ?",
    [...params, limit, offset],
  );

  // Batch-fetch photos + history for this page only
  const reportIds = reports.map((r) => r.id);
  if (reportIds.length > 0) {
    const [allPhotos] = await pool.query(
      "SELECT * FROM report_photos WHERE report_id IN (?) ORDER BY created_at ASC",
      [reportIds],
    );
    const photosByReport = {};
    for (const p of allPhotos) {
      if (!photosByReport[p.report_id]) photosByReport[p.report_id] = [];
      photosByReport[p.report_id].push(p);
    }

    const [allHistory] = await pool.query(
      "SELECT h.*, u.full_name AS changed_by_name " +
      "FROM report_status_history h " +
      "LEFT JOIN users u ON u.id = h.changed_by " +
      "WHERE h.report_id IN (?) ORDER BY h.created_at ASC",
      [reportIds],
    );
    const historyByReport = {};
    for (const h of allHistory) {
      if (!historyByReport[h.report_id]) historyByReport[h.report_id] = [];
      historyByReport[h.report_id].push(h);
    }

    for (const report of reports) {
      report.photos         = photosByReport[report.id]  || [];
      report.status_history = historyByReport[report.id] || [];
    }
  } else {
    for (const report of reports) {
      report.photos         = [];
      report.status_history = [];
    }
  }

  return { reports, total, page, limit, totalPages };
};

// ─── Get single resident report (ownership enforced) ──────

const getMyReportById = async (reportId, userId) => {
  const [rows] = await pool.query(
    "SELECT r.*, b.name AS barangay_name, NULL AS barangay_zone " +
    "FROM reports r " +
    "JOIN barangays b ON b.id = r.barangay_id " +
    "WHERE r.id = ? AND r.deleted_at IS NULL",
    [reportId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Report not found" };
  }

  const report = rows[0];

  // Enforce ownership — only the authenticated resident who submitted the report can access it
  if (report.user_id !== userId) {
    throw { statusCode: 403, message: "You do not have access to this report" };
  }

  const [photos] = await pool.query(
    "SELECT * FROM report_photos WHERE report_id = ? ORDER BY created_at ASC",
    [reportId],
  );
  report.photos = photos;

  const [history] = await pool.query(
    "SELECT h.*, u.full_name AS changed_by_name " +
    "FROM report_status_history h " +
    "LEFT JOIN users u ON u.id = h.changed_by " +
    "WHERE h.report_id = ? ORDER BY h.created_at ASC",
    [reportId],
  );
  report.status_history = history;

  return report;
};

// Does not expose other residents' data; it only indicates whether a matching
// active issue was reported in the same barangay during the last 14 days.
const hasSimilarActiveReport = async ({ barangay_id, violation_type } = {}) => {
  if (!barangay_id || !violation_type) return false;
  const [rows] = await pool.query(
    `SELECT 1
     FROM reports
     WHERE barangay_id = ?
       AND violation_type = ?
       AND status != 'RESOLVED'
       AND deleted_at IS NULL
       AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
     LIMIT 1`,
    [barangay_id, String(violation_type).toUpperCase()],
  );
  return rows.length > 0;
};

// ─── Create (with atomic ref number) ──────────────────────

const create = async (userId, data) => {
  const {
    barangay_id,
    violation_type,
    landmark,
    description,
    pin_lat,
    pin_lng,
    photos = [],
  } = data;

  // Validate barangay
  const [bCheck] = await pool.query("SELECT id FROM barangays WHERE id = ?", [
    barangay_id,
  ]);
  if (bCheck.length === 0) {
    throw { statusCode: 404, message: "Barangay not found" };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Generate sequential RPT-YYYY-NNNNN reference number atomically
    const refNumber = await generateSequentialRef(conn);
    const reportId = generateId();

    const defaultPriorityMap = {
      ILLEGAL_DUMPING: "HIGH",
      OPEN_BURNING: "HIGH",
      OVERFLOWING_BIN: "MEDIUM",
      MISSED_COLLECTION: "MEDIUM",
      IMPROPER_SEGREGATION: "MEDIUM",
      LITTERING: "LOW",
      OTHER: "LOW",
    };
    const initialPriority = defaultPriorityMap[violation_type] || "MEDIUM";

    await conn.query(
      `INSERT INTO reports
         (id, reference_number, user_id, barangay_id, violation_type,
          priority, landmark, description, pin_lat, pin_lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        refNumber,
        userId,
        barangay_id,
        violation_type,
        initialPriority,
        landmark || null,
        description,
        pin_lat || null,
        pin_lng || null,
      ],
    );

    // Insert photos
    for (const url of photos) {
      await conn.query(
        "INSERT INTO report_photos (id, report_id, url) VALUES (?, ?, ?)",
        [generateId(), reportId, url],
      );
    }

    // Insert initial status history
    await conn.query(
      `INSERT INTO report_status_history (id, report_id, status, changed_by)
       VALUES (?, ?, 'SUBMITTED', ?)`,
      [generateId(), reportId, userId],
    );

    await conn.commit();
    const createdReport = await getById(reportId);

    await auditService.log({
      user_id: userId,
      action: "CREATE_REPORT",
      module: "reports",
      record_id: createdReport.id,
      new_value: { reference_number: createdReport.reference_number, violation_type: createdReport.violation_type, priority: createdReport.priority, barangay: createdReport.barangay_name },
    }).catch(() => {});

    // Notify Admins of new report
    const isUrgent = createdReport.priority === "HIGH";
    const violationLabel = createdReport.violation_type
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    notifyAdmins({
      type: "REPORT_UPDATE",
      title: `New ${isUrgent ? "high" : createdReport.priority.toLowerCase()} priority ${violationLabel} report`,
      body: `${createdReport.reference_number} was submitted in ${createdReport.barangay_name}.`,
      ref_id: createdReport.id,
      ref_module: "reports",
    }).catch((err) => console.error("[Notify] ❌ Admin report notification failed:", err.message));

    return createdReport;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ─── Update Status ─────────────────────────────────────────

const updateStatus = async (id, adminId, { status, admin_response }) => {
  const conn = await pool.getConnection();
  let existing;
  let duplicates = [];

  try {
    await conn.beginTransaction();
    const [lockedReports] = await conn.query(
      "SELECT * FROM reports WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
      [id],
    );
    if (lockedReports.length === 0) {
      throw { statusCode: 404, message: "Report not found" };
    }
    existing = lockedReports[0];

    const statusOrder = ["SUBMITTED", "UNDER_REVIEW", "DISPATCHED", "RESOLVED"];
    const currentStatusIndex = statusOrder.indexOf(existing.status);
    const requestedStatusIndex = statusOrder.indexOf(status);

    // Resolution is final. The status can never be changed once a report is
    // resolved, even if a request bypasses the Admin interface.
    if (existing.status === "RESOLVED" && status !== "RESOLVED") {
      throw { statusCode: 400, message: "Resolved reports are final and cannot be reopened" };
    }
    if (requestedStatusIndex < currentStatusIndex) {
      throw { statusCode: 400, message: "Report status cannot move backward" };
    }

    // Repeating the current status is a no-op. An official response may still
    // be changed, but it must not add history or send another notification.
    if (existing.status === status) {
      if (admin_response !== undefined && admin_response !== existing.admin_response) {
        await conn.query("UPDATE reports SET admin_response = ? WHERE id = ?", [
          admin_response,
          id,
        ]);
        await conn.commit();
        await auditService.log({
          user_id: adminId,
          action: "UPDATE_REPORT_RESPONSE",
          module: "reports",
          record_id: id,
          old_value: { admin_response: existing.admin_response, reference_number: existing.reference_number },
          new_value: { admin_response, reference_number: existing.reference_number },
        }).catch(() => {});
        return getById(id);
      }
      await conn.commit();
      return getById(id);
    }

    const fields = ["status = ?"];
    const params = [status];

    if (admin_response !== undefined) {
      fields.push("admin_response = ?");
      params.push(admin_response);
    }

    params.push(id);
    await conn.query(
      `UPDATE reports SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );

    await conn.query(
      `INSERT INTO report_status_history (id, report_id, status, changed_by)
       VALUES (?, ?, ?, ?)`,
      [generateId(), id, status, adminId],
    );

    // Resolve all linked duplicates in the same transaction. This prevents a
    // partial result where the original is resolved but a duplicate is not.
    if (status === "RESOLVED") {
      const [linkedDuplicates] = await conn.query(
        `SELECT id, user_id, reference_number, status
         FROM reports
         WHERE duplicate_of_id = ?
           AND is_duplicate = TRUE
           AND status != 'RESOLVED'
           AND deleted_at IS NULL
         FOR UPDATE`,
        [id],
      );
      duplicates = linkedDuplicates;
      for (const duplicate of duplicates) {
        const duplicateResponse = `Your report ${duplicate.reference_number} was resolved because linked report ${existing.reference_number} has been resolved.`;
        await conn.query(
          "UPDATE reports SET status = 'RESOLVED', admin_response = ? WHERE id = ?",
          [duplicateResponse, duplicate.id],
        );
        await conn.query(
          `INSERT INTO report_status_history (id, report_id, status, changed_by)
           VALUES (?, ?, 'RESOLVED', ?)`,
          [generateId(), duplicate.id, adminId],
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updatedReport = await getById(id);

  await auditService.log({
    user_id: adminId,
    action: "UPDATE_REPORT_STATUS",
    module: "reports",
    record_id: id,
    old_value: { status: existing.status, reference_number: existing.reference_number },
    new_value: { status, admin_response, reference_number: updatedReport.reference_number },
  }).catch(() => {});

  for (const duplicate of duplicates) {
    const duplicateResponse = `Your report ${duplicate.reference_number} was resolved because linked report ${updatedReport.reference_number} has been resolved.`;
    auditService.log({
        user_id: adminId,
        action: "RESOLVE_DUPLICATE_REPORT",
        module: "reports",
        record_id: duplicate.id,
        old_value: { status: duplicate.status, reference_number: duplicate.reference_number },
        new_value: { status: "RESOLVED", duplicate_of: updatedReport.reference_number },
    }).catch(() => {});
    if (duplicate.user_id) {
      sendToUser({
        user_id: duplicate.user_id,
        type: "REPORT_UPDATE",
        title: "Report Resolved",
        body: duplicateResponse,
        ref_id: duplicate.id,
        ref_module: "reports",
      }).catch((err) => console.error("[Notify] ❌ Duplicate report notification failed:", err.message));
    }
  }

  // Notify resident report owner
  if (updatedReport.user_id) {
    const statusLabels = {
      UNDER_REVIEW: "Under Review",
      DISPATCHED: "Dispatched (In Progress)",
      RESOLVED: "Resolved",
      SUBMITTED: "Submitted",
    };
    const isResolved = status === "RESOLVED";
    sendToUser({
      user_id: updatedReport.user_id,
      type: "REPORT_UPDATE",
      title: isResolved ? "Your report was resolved" : `Your report is now ${statusLabels[status] || status}`,
      body: isResolved
        ? `Your report ${updatedReport.reference_number} has been resolved.`
        : `Your report ${updatedReport.reference_number} is now ${statusLabels[status] || status}.`,
      ref_id: updatedReport.id,
      ref_module: "reports",
    }).catch((err) => console.error("[Notify] ❌ Resident report update notification failed:", err.message));
  }

  return updatedReport;
};

// ─── Flag Report ───────────────────────────────────────────

const flagReport = async (id, adminId, data) => {
  const existing = await getById(id);

  const fields = [];
  const params = [];

  if (data.is_false === true && data.is_duplicate === true) {
    throw { statusCode: 400, message: "A report cannot be both false and duplicate" };
  }

  if (data.is_false === true && !data.false_reason) {
    throw { statusCode: 400, message: "A reason is required when flagging a false report" };
  }
  if (data.is_duplicate === true && (!data.duplicate_reason || !data.duplicate_of_reference)) {
    throw { statusCode: 400, message: "An original report and reason are required when flagging a duplicate" };
  }

  if (data.is_false !== undefined) {
    fields.push("is_false = ?");
    params.push(data.is_false);
    fields.push("false_reason = ?", "false_flagged_by = ?", "false_flagged_at = ?");
    params.push(data.is_false ? data.false_reason : null, data.is_false ? adminId : null, data.is_false ? new Date() : null);
    if (data.is_false) {
      fields.push("is_duplicate = ?", "duplicate_of_id = ?", "duplicate_reason = ?", "duplicate_flagged_by = ?", "duplicate_flagged_at = ?");
      params.push(false, null, null, null, null);
    }
  }

  if (data.is_duplicate !== undefined) {
    fields.push("is_duplicate = ?");
    params.push(data.is_duplicate);
    let duplicateOfId = null;
    if (data.is_duplicate) {
      const duplicateReference = data.duplicate_of_reference.trim().toUpperCase();
      const [matches] = await pool.query(
        "SELECT id, barangay_id FROM reports WHERE UPPER(reference_number) = ? AND id != ? AND deleted_at IS NULL",
        [duplicateReference, id],
      );
      if (matches.length === 0) throw { statusCode: 404, message: "Original report was not found" };
      if (matches[0].barangay_id !== existing.barangay_id) {
        throw { statusCode: 400, message: "The original report must be in the same barangay" };
      }
      duplicateOfId = matches[0].id;
    }
    fields.push("duplicate_of_id = ?", "duplicate_reason = ?", "duplicate_flagged_by = ?", "duplicate_flagged_at = ?");
    params.push(duplicateOfId, data.is_duplicate ? data.duplicate_reason : null, data.is_duplicate ? adminId : null, data.is_duplicate ? new Date() : null);
    if (data.is_duplicate) {
      fields.push("is_false = ?", "false_reason = ?", "false_flagged_by = ?", "false_flagged_at = ?");
      params.push(false, null, null, null);
    }
  }

  if (data.resolve) {
    fields.push("status = ?", "admin_response = ?");
    const defaultResponse = data.is_duplicate
      ? `This report is a duplicate of ${data.duplicate_of_reference.trim().toUpperCase()} and is already being handled.`
      : "This report has been reviewed and marked as invalid.";
    params.push("RESOLVED", data.admin_response || defaultResponse);
  }

  if (fields.length === 0) {
    throw { statusCode: 400, message: "Nothing to update" };
  }

  params.push(id);
  await pool.query(
    `UPDATE reports SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  if (data.resolve && existing.status !== "RESOLVED") {
    await pool.query(
      "INSERT INTO report_status_history (id, report_id, status, changed_by) VALUES (?, ?, 'RESOLVED', ?)",
      [generateId(), id, adminId],
    );
  }

  auditService.log({
    user_id: adminId,
    action: "FLAG_REPORT",
    module: "reports",
    record_id: id,
    old_value: { is_false: existing.is_false, is_duplicate: existing.is_duplicate },
    new_value: data,
  }).catch(() => {});

  const updatedReport = await getById(id);
  if (data.resolve && existing.status !== "RESOLVED" && updatedReport.user_id) {
    sendToUser({
      user_id: updatedReport.user_id,
      type: "REPORT_UPDATE",
      title: "Report Resolved",
      body: updatedReport.admin_response || "Your report has been reviewed and resolved.",
      ref_id: updatedReport.id,
      ref_module: "reports",
    }).catch(() => {});
  }
  return updatedReport;
};

// ─── Update Priority ───────────────────────────────────────

const updatePriority = async () => {
  throw {
    statusCode: 403,
    message: "Report priority is fixed after submission",
  };
};

// ─── Add Note ──────────────────────────────────────────────

const addNote = async (reportId, adminId, note) => {
  const existing = await getById(reportId);

  const noteId = generateId();

  await pool.query(
    `INSERT INTO report_notes (id, report_id, note, created_by)
     VALUES (?, ?, ?, ?)`,
    [noteId, reportId, note, adminId],
  );

  auditService.log({
    user_id: adminId,
    action: "ADD_REPORT_NOTE",
    module: "reports",
    record_id: reportId,
    new_value: { note, reference_number: existing.reference_number },
  }).catch(() => {});

  const [rows] = await pool.query(
    `SELECT
       n.*,
       u.full_name AS created_by_name
     FROM report_notes n
     JOIN users u ON u.id = n.created_by
     WHERE n.id = ?`,
    [noteId],
  );

  return rows[0];
};

// ─── Get Notes ─────────────────────────────────────────────

const getNotes = async (reportId) => {
  await getById(reportId);

  const [rows] = await pool.query(
    `SELECT
       n.*,
       u.full_name AS created_by_name
     FROM report_notes n
     JOIN users u ON u.id = n.created_by
     WHERE n.report_id = ?
     ORDER BY n.created_at ASC`,
    [reportId],
  );

  return rows;
};

// ─── Get Status History ────────────────────────────────────

const getStatusHistory = async (reportId) => {
  await getById(reportId);

  const [rows] = await pool.query(
    `SELECT
       h.*,
       u.full_name AS changed_by_name
     FROM report_status_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.report_id = ?
     ORDER BY h.created_at ASC`,
    [reportId],
  );

  return rows;
};


// ─── Get resident's own report statistics ──────────────────
const getMyStats = async (userId) => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*)                                              AS total,
       SUM(status = 'RESOLVED')                             AS resolved,
       SUM(status IN ('PENDING','SUBMITTED'))               AS pending,
       SUM(status = 'UNDER_REVIEW')                         AS under_review,
       SUM(status IN ('DISPATCHED','IN_PROGRESS'))          AS in_progress
     FROM reports
     WHERE user_id = ? AND deleted_at IS NULL`,
    [userId],
  );


  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    resolved: Number(row.resolved ?? 0),
    pending: Number(row.pending ?? 0),
    under_review: Number(row.under_review ?? 0),
    in_progress: Number(row.in_progress ?? 0),
  };
};

// ─── Soft-delete a report (Admin or Resident pending only) ─
const softDelete = async (id, user, ip = null) => {
  const [rows] = await pool.query(
    "SELECT * FROM reports WHERE id = ? AND deleted_at IS NULL",
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Report not found" };
  }

  const report = rows[0];

  // If resident, verify ownership and pending status
  if (user.role !== "ADMIN") {
    if (report.user_id !== user.id) {
      throw {
        statusCode: 403,
        message: "You do not have permission to delete this report",
      };
    }

    if (!["SUBMITTED", "PENDING"].includes(report.status)) {
      throw {
        statusCode: 400,
        message: "Only pending reports can be cancelled or deleted",
      };
    }
  }

  await pool.query(
    "UPDATE reports SET deleted_at = NOW() WHERE id = ?",
    [id],
  );

  // Audit log
  auditService.log({
    user_id: user.id,
    action: "REPORT_DELETED",
    module: "reports",
    record_id: report.id,
    ip_address: ip,
    old_value: {
      reference_number: report.reference_number,
      violation_type: report.violation_type,
      status: report.status,
      barangay_id: report.barangay_id,
      reporter_id: report.user_id,
    },
    new_value: {
      deleted_by_role: user.role,
      reason:
        user.role === "ADMIN"
          ? "Admin soft-delete"
          : "Resident cancelled submission",
    },
  }).catch(() => {});

  return { id: report.id, reference_number: report.reference_number };
};

module.exports = {
  getAll,
  getById,
  getMyReports,
  getMyReportById,
  hasSimilarActiveReport,
  getMyStats,
  create,
  updateStatus,
  flagReport,
  updatePriority,
  addNote,
  getNotes,
  getStatusHistory,
  softDelete,
};
