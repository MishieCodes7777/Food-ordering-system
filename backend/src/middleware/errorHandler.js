// Global error handling middleware
// Catches any unhandled errors and returns a safe response

import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  // Log with enough context to actually debug a production incident from
  // this line alone: which request, which user/admin, what failed.
  logger.error({
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    adminId: req.admin?.id,
    err: { message: err.message, stack: err.stack },
  }, "Unhandled request error");

  // Don't leak stack traces or internal details to the client
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again later."
      : err.message || "Internal server error";

  res.status(statusCode).json({
    message,
    requestId: req.id,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

export default errorHandler;
