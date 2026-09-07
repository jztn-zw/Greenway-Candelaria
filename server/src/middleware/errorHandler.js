const errorHandler = (err, req, res, next) => {
  if (err.name === "ZodError") {
    // Zod v4 exposes validation entries as `issues` (v3 used `errors`).
    const issues = err.issues || err.errors || [];
    const errors = issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    console.warn(`[API 400] ${req.method} ${req.originalUrl}`, {
      message: "Validation error",
      validation: errors,
    });
    return res.status(400).json({
      success: false,
      message: errors.map((issue) => issue.message).join(" ") || "Validation error",
      errors,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const log = {
    message,
    ...(process.env.NODE_ENV !== "production" && err.stack ? { stack: err.stack } : {}),
  };
  (statusCode >= 500 ? console.error : console.warn)(
    `[API ${statusCode}] ${req.method} ${req.originalUrl}`,
    log,
  );

  return res.status(statusCode).json({
    success: false,
    // Do not expose internal implementation errors to the browser.
    message: statusCode >= 500 ? "Something went wrong. Please try again." : message,
  });
};

module.exports = errorHandler;
