/**
 * Global Error Handler Middleware
 * Provides consistent error handling across the application
 */
const config = require("../config")

function errorHandler(err, req, res, next) {
  // Log error details
  console.error("Global Error Handler:", {
    message: err.message,
    stack: config.server.env === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  })

  // Default error response
  let statusCode = err.statusCode || 500
  let message = err.message || "Internal Server Error"

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400
    message = "Validation Error: " + err.message
  } else if (err.code === "SQLITE_CONSTRAINT") {
    statusCode = 409
    message = "Database constraint violation"
  } else if (err.code === "ENOTFOUND") {
    statusCode = 503
    message = "External service unavailable"
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.server.env === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
