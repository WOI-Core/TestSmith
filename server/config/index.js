/**
 * Configuration Management
 * Centralizes all application configuration with environment-based overrides
 */
require("dotenv").config()

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || "0.0.0.0",
    env: process.env.NODE_ENV || "development",
  },

  // Database Configuration
  database: {
    path: process.env.DB_PATH || "./data/gradersmith.db",
    options: {
      // SQLite specific options
      busyTimeout: 30000,
      synchronous: "NORMAL",
    },
  },

  // External Services
  services: {
    github: {
      token: process.env.GITHUB_TOKEN,
      repoBase: "https://api.github.com/repos/WOI-Core/woi-grader-archive/contents/Camp2",
    },
    judge0: {
      url: process.env.JUDGE0_URL || "http://localhost:2358",
    },
    searchsmith: {
      url: process.env.SEARCHSMITH_URL || "http://localhost:8000",
    },
    toolsmith: {
      url: process.env.TOOLSMITH_URL || "http://localhost:5050",
    },
  },

  // Security Configuration
  security: {
    saltRounds: Number.parseInt(process.env.SALT_ROUNDS) || 10,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  // Cache Configuration
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100, // maximum number of cached items
  },

  // Timezone Configuration
  timezone: {
    default: "Asia/Bangkok",
    offset: "+7 hours",
  },
}

// Validation function to ensure required config is present
function validateConfig() {
  const required = ["services.github.token"]

  const missing = required.filter((path) => {
    const value = path.split(".").reduce((obj, key) => obj?.[key], config)
    return !value
  })

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`)
  }
}

// Export configuration with validation
module.exports = {
  ...config,
  validateConfig,
}
