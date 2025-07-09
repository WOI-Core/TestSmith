require("dotenv").config()

const config = {
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || "0.0.0.0",
    env: process.env.NODE_ENV || "development",
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  services: {
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
  security: {
    saltRounds: Number.parseInt(process.env.SALT_ROUNDS) || 10,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
  },
  cache: {
    ttl: 5 * 60 * 1000,
    maxSize: 100,
  },
  timezone: {
    default: "Asia/Bangkok",
    offset: "+7 hours",
  },
}

function validateConfig() {
  const required = ["supabase.url", "supabase.serviceKey"]

  const missing = required.filter((path) => {
    const value = path.split(".").reduce((obj, key) => obj?.[key], config)
    return !value
  })

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`)
  }
}

module.exports = {
  ...config,
  validateConfig,
}