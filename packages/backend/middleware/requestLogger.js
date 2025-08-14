/**
 * Request Logger Middleware
 * Logs incoming requests for debugging and monitoring
 */
const config = require("../config")

function requestLogger(req, res, next) {
  const start = Date.now()

  // Log request
  if (config.server.env === "development") {
    console.log(`📥 ${req.method} ${req.url} - ${req.ip}`)
  }

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start
    const statusColor = res.statusCode >= 400 ? "🔴" : "🟢"

    if (config.server.env === "development") {
      console.log(`📤 ${statusColor} ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`)
    }
  })

  next()
}

module.exports = requestLogger
