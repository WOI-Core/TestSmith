// Timezone utility functions for Bangkok (GMT+7)

/**
 * Format a date string to Bangkok timezone
 * @param {string|Date} dateInput - Date string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string in Bangkok timezone
 */
function formatToBangkokTime(dateInput, options = {}) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput

  const defaultOptions = {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }

  const formatOptions = { ...defaultOptions, ...options }

  try {
    return date.toLocaleString("en-GB", formatOptions)
  } catch (error) {
    console.error("Error formatting date to Bangkok time:", error)
    return "Invalid Date"
  }
}

/**
 * Format a date to a more readable Bangkok time format
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Human-readable date string
 */
function formatToBangkokTimeReadable(dateInput) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput

  try {
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Bangkok",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch (error) {
    console.error("Error formatting date to readable Bangkok time:", error)
    return "Invalid Date"
  }
}

/**
 * Get relative time from now in Bangkok timezone
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Relative time string (e.g., "2 hours ago")
 */
function getRelativeTimeBangkok(dateInput) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const now = new Date()

  // Convert both dates to Bangkok timezone for accurate comparison
  const bangkokDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))

  const diffMs = bangkokNow - bangkokDate
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "Just now"
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  } else {
    return formatToBangkokTimeReadable(date)
  }
}

/**
 * Get current Bangkok time
 * @returns {string} Current time in Bangkok timezone
 */
function getCurrentBangkokTime() {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
}

// Export functions for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatToBangkokTime,
    formatToBangkokTimeReadable,
    getRelativeTimeBangkok,
    getCurrentBangkokTime,
  }
}
