const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const path = require("path")

const config = require("./config")
const DatabaseManager = require("./config/database")

const authRoutes = require("./routes/authRoutes")
const problemRoutes = require("./routes/problemRoutes")
const submissionRoutes = require("./routes/submissionRoutes")
const progressRoutes = require("./routes/progressRoutes")

const { createProxyMiddleware } = require("http-proxy-middleware")
const multer = require("multer")
const upload = multer()

class GraderSmithServer {
  constructor() {
    this.app = express()
    this.server = null
  }

  async initialize() {
    try {
      config.validateConfig()
      this.setupMiddleware()
      this.setupRoutes()
      this.setupLegacyRoutes()
      this.setupErrorHandling()
      console.log("✅ Server initialized successfully")
    } catch (error) {
      console.error("❌ Server initialization failed:", error)
      process.exit(1)
    }
  }

  setupMiddleware() {
    this.app.use(cors())
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: true }))
    console.log("✅ Middleware configured")
  }

  setupRoutes() {
    this.app.get("/", (req, res) => {
      const bangkokTime = new Date().toLocaleString("en-US", {
        timeZone: config.timezone.default,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      })

      res.json({
        message: "🟢 GraderSmith Backend is Running!",
        timestamp: bangkokTime,
        version: "2.0.0",
        environment: config.server.env,
      })
    })

    this.app.use("/api/auth", authRoutes)
    this.app.use("/api/problems", problemRoutes)
    this.app.use("/api/submissions", submissionRoutes)
    this.app.use("/api/progress", progressRoutes)

    console.log("✅ New routes configured")
  }

  setupLegacyRoutes() {
    this.app.post("/api/signup", (req, res, next) => {
      req.url = "/signup"
      authRoutes(req, res, next)
    })

    this.app.post("/api/login", (req, res, next) => {
      req.url = "/login"
      authRoutes(req, res, next)
    })

    this.app.get("/api/verify-role/:userId", (req, res, next) => {
      req.url = `/verify-role/${req.params.userId}`
      authRoutes(req, res, next)
    })

    this.app.get("/api/github-list", (req, res, next) => {
      req.url = "/list"
      problemRoutes(req, res, next)
    })

    this.app.post("/api/submit-solution", (req, res, next) => {
      req.url = "/submit"
      submissionRoutes(req, res, next)
    })

    this.app.get("/api/submissions/:userId", (req, res, next) => {
      req.url = `/user/${req.params.userId}`
      submissionRoutes(req, res, next)
    })

    this.app.get("/api/submission/:submissionId", (req, res, next) => {
      req.url = `/${req.params.submissionId}`
      submissionRoutes(req, res, next)
    })

    this.app.get("/api/submission-result/:submissionId", (req, res, next) => {
      req.url = `/${req.params.submissionId}/results`
      submissionRoutes(req, res, next)
    })

    this.app.get("/api/is-evaluating/:userId/:problemId", (req, res, next) => {
      req.url = `/status/${req.params.userId}/${req.params.problemId}`
      submissionRoutes(req, res, next)
    })

    this.app.get("/api/latest-submission/:userId/:problemId", (req, res, next) => {
      req.url = `/latest/${req.params.userId}/${req.params.problemId}`
      submissionRoutes(req, res, next)
    })

    this.app.post("/api/progress", (req, res, next) => {
      req.url = "/"
      progressRoutes(req, res, next)
    })

    this.app.get("/api/progress/:userId", (req, res, next) => {
      req.url = `/${req.params.userId}`
      progressRoutes(req, res, next)
    })

    this.app.get("/api/leaderboard", (req, res, next) => {
      req.url = "/leaderboard"
      progressRoutes(req, res, next)
    })

    this.app.post("/api/searchsmith", async (req, res) => {
      try {
        const { text } = req.body
        if (!text) return res.status(400).json({ error: "Missing search text" })

        const response = await fetch("http://localhost:8000/query/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) throw new Error("SearchSmith backend error")
        const data = await response.json()
        res.json(data)
      } catch (err) {
        res.status(500).json({ error: err.message || "Internal error" })
      }
    })

    this.app.post("/api/toolsmith", async (req, res) => {
      try {
        const response = await fetch("http://localhost:5050/tool-smith", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        })

        if (!response.ok) throw new Error("Failed to generate from ToolSmith API")
        res.set("Content-Disposition", response.headers.get("content-disposition"))
        res.set("Content-Type", "application/zip")
        response.body.pipe(res)
      } catch (err) {
        res.status(500).json({ error: "ToolSmith backend error", details: err.message })
      }
    })

    this.app.post("/api/toolsmith-upload", upload.single("file"), async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" })

        const FormData = require("form-data")
        const formData = new FormData()
        formData.append("file", req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype || "application/zip",
        })

        const response = await fetch("http://localhost:5050/grader-upload", {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        })

        const resultText = await response.text()
        res.json({ status: resultText })
      } catch (err) {
        res.status(500).json({ error: "Failed to upload to ToolSmith backend", details: err.message })
      }
    })

    this.app.use(
      "/searchsmith-api",
      createProxyMiddleware({
        target: "http://localhost:8000",
        changeOrigin: true,
        pathRewrite: { "^/searchsmith-api": "" },
      }),
    )

    console.log("✅ Legacy routes configured")
  }

  setupErrorHandling() {
    this.app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        error: "Route not found",
      })
    })

    this.app.use((err, req, res, next) => {
      console.error("Global Error:", err)
      res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      })
    })

    console.log("✅ Error handling configured")
  }

  async start() {
    try {
      await this.initialize()

      const PORT = config.server.port
      const HOST = config.server.host

      this.server = this.app.listen(PORT, HOST, () => {
        const bangkokTime = new Date().toLocaleString("en-US", {
          timeZone: config.timezone.default,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        })

        console.log(`🚀 Server running on http://${HOST}:${PORT}`)
        console.log(`🕐 Server timezone set to ${config.timezone.default}: ${bangkokTime}`)
        console.log(`🌍 Environment: ${config.server.env}`)
      })
    } catch (error) {
      console.error("❌ Failed to start server:", error)
      process.exit(1)
    }
  }

  async shutdown() {
    console.log("🔄 Shutting down server...")

    if (this.server) {
      this.server.close()
    }

    await DatabaseManager.close()
    console.log("✅ Server shutdown complete")
    process.exit(0)
  }
}

const server = new GraderSmithServer()

process.on("SIGTERM", () => server.shutdown())
process.on("SIGINT", () => server.shutdown())

server.start()