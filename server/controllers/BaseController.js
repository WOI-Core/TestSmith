/**
 * Base Controller Class
 * Provides common functionality for all controllers
 */
class BaseController {
  constructor(name) {
    this.controllerName = name
  }

  /**
   * Send success response
   */
  sendSuccess(res, data, message = "Success", statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    })
  }

  /**
   * Send error response
   */
  sendError(res, error, statusCode = 500) {
    const message = error.message || "Internal server error"

    console.error(`[${this.controllerName}] Error:`, error)

    res.status(statusCode).json({
      success: false,
      error: message,
    })
  }

  /**
   * Validate required fields in request body
   */
  validateRequired(req, res, requiredFields) {
    const missing = requiredFields.filter((field) => !req.body[field])

    if (missing.length > 0) {
      this.sendError(res, new Error(`Missing required fields: ${missing.join(", ")}`), 400)
      return false
    }

    return true
  }

  /**
   * Async wrapper for route handlers
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next)
    }
  }
}

module.exports = BaseController
