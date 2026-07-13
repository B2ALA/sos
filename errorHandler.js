/** Wraps async route handlers so rejected promises reach the error handler */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Express 404 handler for unmatched routes */
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Centralized error handler — keep this registered last in server.js */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error." : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
