const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || "unknown";

  if (err.name === "MulterError") {
    console.warn(`[API 400] ${req.method} ${req.originalUrl} [${requestId}]`, {
      requestId,
      message: err.message,
      code: err.code,
    });
    return res.status(400).json({
      success: false,
      message: "The uploaded file could not be accepted.",
      requestId,
    });
  }

  if (err.name === "ZodError") {
    // Zod v4 exposes validation entries as `issues` (v3 used `errors`).
    const issues = err.issues || err.errors || [];
    const errors = issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    console.warn(`[API 400] ${req.method} ${req.originalUrl} [${requestId}]`, {
      requestId,
      message: "Validation error",
      validation: errors,
    });
    return res.status(400).json({
      success: false,
      message: errors.map((issue) => issue.message).join(" ") || "Validation error",
      errors,
      requestId,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const log = {
    requestId,
    message,
    ...(process.env.NODE_ENV !== "production" && err.stack ? { stack: err.stack } : {}),
  };
  (statusCode >= 500 ? console.error : console.warn)(
    `[API ${statusCode}] ${req.method} ${req.originalUrl} [${requestId}]`,
    log,
  );

  return res.status(statusCode).json({
    success: false,
    // Do not expose internal implementation errors to the browser.
    message: statusCode >= 500 ? "Something went wrong. Please try again." : message,
    // Lets support match a user report to a server log without exposing internals.
    requestId,
  });
};

module.exports = errorHandler;
