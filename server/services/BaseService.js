/**
 * Base Service Class
 * Provides common functionality for all services
 */
class BaseService {
  constructor(name) {
    this.serviceName = name
  }

  /**
   * Log service operations
   */
  log(message, level = "info") {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`)
  }

  /**
   * Handle service errors consistently
   */
  handleError(error, context = "") {
    const message = `${context ? context + ": " : ""}${error.message}`
    this.log(message, "error")
    throw new Error(message)
  }

  /**
   * Validate required parameters
   */
  validateRequired(params, requiredFields) {
    const missing = requiredFields.filter((field) => !params[field])
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`)
    }
  }
}

module.exports = BaseService
