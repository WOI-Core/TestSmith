// server.js - GraderSmiths OJ backend
require('dotenv').config();

const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const bodyParser = require("body-parser")
const cors = require("cors")
const bcrypt = require("bcrypt")
const fetch = require("node-fetch")
const path = require("path")
const fs = require("fs")
const multer = require("multer")
const upload = multer()
const app = express()
const PORT = 3000
const SALT_ROUNDS = 10

const { createProxyMiddleware } = require("http-proxy-middleware")

// --- Config ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const JUDGE0_API_URL = "http://localhost:2358"
const GITHUB_REPO_API_BASE = "https://api.github.com/repos/WOI-Core/woi-grader-archive/contents/Camp2"

// Set timezone to Bangkok (GMT+7)
process.env.TZ = "Asia/Bangkok"

// --- Middleware ---
app.use(cors())
app.use(bodyParser.json())

// --- Helper function to get Bangkok timestamp ---
function getBangkokTimestamp() {
  return new Date()
    .toLocaleString("sv-SE", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(" ", "T")
}

// --- In-memory cache for GitHub API responses ---
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000
function setCache(key, data) {
  cache.set(key, { timestamp: Date.now(), data })
  setTimeout(() => cache.delete(key), CACHE_TTL)
}
function getCache(key) {
  if (cache.has(key)) {
    const entry = cache.get(key)
    if (Date.now() - entry.timestamp < CACHE_TTL) return entry.data
  }
  return null
}

// --- Database Setup ---
const dbPath = path.resolve("./users.db")
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("DB connection error", err)
  else console.log("Connected to SQLite at", dbPath)
})

// Database migration function
function migrateDatabase() {
  return new Promise((resolve) => {
    db.serialize(() => {
      // Check if completed_at column exists in user_progress
      db.get("PRAGMA table_info(user_progress)", (err, info) => {
        if (err) {
          console.error("Error checking user_progress schema:", err)
          resolve()
          return
        }

        // Get all columns for user_progress
        db.all("PRAGMA table_info(user_progress)", (err, columns) => {
          if (err) {
            console.error("Error getting user_progress columns:", err)
            resolve()
            return
          }

          const hasCompletedAt = columns.some((col) => col.name === "completed_at")

          if (!hasCompletedAt) {
            console.log("Adding completed_at column to user_progress...")
            db.run(
              "ALTER TABLE user_progress ADD COLUMN completed_at TEXT DEFAULT (datetime('now', '+7 hours'))",
              (err) => {
                if (err) {
                  console.error("Error adding completed_at column:", err)
                } else {
                  console.log("✅ Added completed_at column to user_progress")
                  // Update existing records
                  db.run(
                    "UPDATE user_progress SET completed_at = datetime('now', '+7 hours') WHERE completed_at IS NULL",
                    (err) => {
                      if (err) {
                        console.error("Error updating existing user_progress records:", err)
                      } else {
                        console.log("✅ Updated existing user_progress records with Bangkok time")
                      }
                    },
                  )
                }
              },
            )
          }

          // Check if created_at column exists in users
          db.all("PRAGMA table_info(users)", (err, userColumns) => {
            if (err) {
              console.error("Error getting users columns:", err)
              resolve()
              return
            }

            const hasCreatedAt = userColumns.some((col) => col.name === "created_at")

            if (!hasCreatedAt) {
              console.log("Adding created_at column to users...")
              db.run("ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT (datetime('now', '+7 hours'))", (err) => {
                if (err) {
                  console.error("Error adding created_at column:", err)
                } else {
                  console.log("✅ Added created_at column to users")
                  // Update existing records
                  db.run(
                    "UPDATE users SET created_at = datetime('now', '+7 hours') WHERE created_at IS NULL",
                    (err) => {
                      if (err) {
                        console.error("Error updating existing users records:", err)
                      } else {
                        console.log("✅ Updated existing users records with Bangkok time")
                      }
                    },
                  )
                }
                resolve()
              })
            } else {
              resolve()
            }
          })
        })
      })
    })
  })
}

// Run migration and then set up tables
db.serialize(async () => {
  // Run migration first
  await migrateDatabase()

  // Create tables if they don't exist (with new schema)
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        created_at TEXT DEFAULT (datetime('now', '+7 hours'))
    )`)

  db.run(`CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        problem_id TEXT NOT NULL,
        completed_at TEXT DEFAULT (datetime('now', '+7 hours')),
        UNIQUE(user_id, problem_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`)

  db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        problem_id TEXT NOT NULL,
        language TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now', '+7 hours')),
        source_code TEXT,
        judge0_results TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`)
})

// --- Helper: Fetch test cases from GitHub ---
async function getTestCasesFromGitHub(problemId) {
  const cacheKey = `testcases-${problemId}`
  const cachedData = getCache(cacheKey)
  if (cachedData) return cachedData

  const inputsUrl = `${GITHUB_REPO_API_BASE}/${problemId}/TestCases/Inputs`
  const outputsUrl = `${GITHUB_REPO_API_BASE}/${problemId}/TestCases/Outputs`
  const headers = { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "myOJ-server" }

  const [inputsRes, outputsRes] = await Promise.all([fetch(inputsUrl, { headers }), fetch(outputsUrl, { headers })])
  if (!inputsRes.ok) throw new Error(`GitHub API error fetching inputs: ${inputsRes.statusText}`)
  if (!outputsRes.ok) throw new Error(`GitHub API error fetching outputs: ${outputsRes.statusText}`)

  const inputFiles = await inputsRes.json()
  const outputFiles = await outputsRes.json()

  // Sort files by name numerically
  const numericSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })
  inputFiles.sort(numericSort)
  outputFiles.sort(numericSort)

  if (inputFiles.length === 0 || inputFiles.length !== outputFiles.length)
    throw new Error("Mismatched or missing input/output files in GitHub repo.")

  // Fetch content of each file
  const testCasePromises = inputFiles.map(async (inFile, idx) => {
    const outFile = outputFiles[idx]
    const [inputContentRes, outputContentRes] = await Promise.all([
      fetch(inFile.download_url, { headers }),
      fetch(outFile.download_url, { headers }),
    ])
    return {
      input: await inputContentRes.text(),
      expectedOutput: await outputContentRes.text(),
    }
  })

  const testCases = await Promise.all(testCasePromises)
  setCache(cacheKey, testCases)
  return testCases
}

// --- Helper: Fetch config.json for a problem from GitHub ---
async function getProblemConfigFromGitHub(problemId) {
  const cacheKey = `config-${problemId}`
  const cachedData = getCache(cacheKey)
  if (cachedData) return cachedData
  const url = `https://raw.githubusercontent.com/WOI-Core/woi-grader-archive/refs/heads/main/Camp2/${problemId}/config.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Config not found on GitHub (HTTP ${res.status})`)
  const config = await res.json()
  setCache(cacheKey, config)
  return config
}

// --- API ROUTER ---
const apiRouter = express.Router()

// --- Signup ---
apiRouter.post("/signup", async (req, res) => {
  const { username, email, password, role = "user" } = req.body
  if (!username || !email || !password)
    return res.status(400).json({ success: false, error: "All fields are required." })

  // Validate role
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ success: false, error: "Invalid role specified." })
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
    const bangkokTimestamp = getBangkokTimestamp()

    db.run(
      `INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      [username, email, password_hash, role, bangkokTimestamp],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed"))
            return res.status(409).json({ success: false, error: "Username or email already exists." })
          return res.status(500).json({ success: false, error: "Database error during signup." })
        }
        res.status(201).json({
          success: true,
          message: "User created.",
          userId: this.lastID,
          username: username,
          role: role,
        })
      },
    )
  } catch (e) {
    res.status(500).json({ success: false, error: "Unexpected server error." })
  }
})

// --- Login ---
apiRouter.post("/login", (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ success: false, error: "Username and password are required." })
  db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, username], async (err, user) => {
    if (err) return res.status(500).json({ success: false, error: "Database error during login." })
    if (!user) return res.status(401).json({ success: false, error: "Invalid credentials." })
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ success: false, error: "Invalid credentials." })
    res.json({
      success: true,
      message: "Login successful",
      userId: user.id,
      username: user.username,
      role: user.role || "user",
    })
  })
})

// --- Problems List ---
apiRouter.get("/github-list", async (req, res) => {
  const cachedData = getCache("problem-list")
  if (cachedData) return res.json(cachedData)
  try {
    const githubRes = await fetch(GITHUB_REPO_API_BASE, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "myOJ-server" },
    })
    if (!githubRes.ok) throw new Error(`GitHub API failed with status: ${githubRes.status}`)
    const data = await githubRes.json()
    setCache("problem-list", data)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch problem list from GitHub." })
  }
})

// --- SUBMIT SOLUTION ---
apiRouter.post("/submit-solution", async (req, res) => {
  const { problemId, language_id, source_code, userId } = req.body
  if (!problemId || !language_id || !source_code) return res.status(400).json({ error: "Missing required fields" })

  // Define language mapping at the beginning of the function
  const language = language_id === "71" ? "Python" : language_id === "54" ? "C++" : language_id
  const bangkokTimestamp = getBangkokTimestamp()
  let submissionId = null

  try {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO submissions (user_id, problem_id, language, status, source_code, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, problemId, language, "Evaluating", source_code, bangkokTimestamp],
        function (err) {
          if (err) reject(err)
          else {
            submissionId = this.lastID
            resolve()
          }
        },
      )
    })

    const config = await getProblemConfigFromGitHub(problemId)
    const cpu_time_limit = config.timeLimit ? Number(config.timeLimit) / 1000 : 2
    const memory_limit = config.memoryLimit ? Number(config.memoryLimit) * 1024 : 128000
    const wall_time_limit = 20

    const testCases = await getTestCasesFromGitHub(problemId)

    const submissions = testCases.map((tc) => ({
      language_id,
      source_code: Buffer.from(source_code).toString("base64"),
      stdin: Buffer.from(tc.input).toString("base64"),
      expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput).toString("base64") : null,
      cpu_time_limit,
      wall_time_limit,
      memory_limit,
    }))

    const tokenResponse = await fetch(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissions }),
    })
    if (!tokenResponse.ok) throw new Error("Failed to create batch submission on Judge0.")
    const tokens = await tokenResponse.json()
    const tokenString = tokens.map((t) => t.token).join(",")

    let finalResults
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const resultResponse = await fetch(
        `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenString}&base64_encoded=true&fields=*`,
      )
      const data = await resultResponse.json()
      if (data.submissions && data.submissions.every((s) => s.status.id > 2)) {
        finalResults = data.submissions
        break
      }
    }
    if (!finalResults) return res.status(500).json({ error: "Timed out waiting for judge verdicts." })

    const status = finalResults.every((r) => r.status && r.status.description === "Accepted") ? "Accepted" : "Rejected"
    db.run(`UPDATE submissions SET status = ? WHERE id = ?`, [status, submissionId])

    db.run(`UPDATE submissions SET judge0_results = ? WHERE id = ?`, [JSON.stringify(finalResults), submissionId])

    if (status === "Accepted" && userId && problemId) {
      const completedTimestamp = getBangkokTimestamp()
      // Use INSERT OR REPLACE to handle both new and existing records
      db.run(`INSERT OR REPLACE INTO user_progress (user_id, problem_id, completed_at) VALUES (?, ?, ?)`, [
        userId,
        problemId,
        completedTimestamp,
      ])
    }

    res.json({ results: finalResults })
  } catch (error) {
    console.error("Submission processing failed:", error.message)
    res.status(500).json({ error: error.message || "An internal server error occurred." })
  }
})

// --- Progress, Leaderboard, Submissions API ---

apiRouter.post("/progress", (req, res) => {
  const { userId, problemId } = req.body
  if (!userId || !problemId) return res.status(400).json({ error: "Missing userId or problemId" })

  const completedTimestamp = getBangkokTimestamp()
  // Use INSERT OR REPLACE to handle both new and existing records
  db.run(
    `INSERT OR REPLACE INTO user_progress (user_id, problem_id, completed_at) VALUES (?, ?, ?)`,
    [userId, problemId, completedTimestamp],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error on save" })
      res.json({ message: "Progress saved" })
    },
  )
})

app.post("/api/searchsmith", async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: "Missing search text" })

    // Forward to local FastAPI SearchSmith (no CORS issue)
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

// ================= ToolSmith Proxy =====================
// This endpoint will properly stream ZIP files (no JSON.parse error)
app.post("/api/toolsmith", async (req, res) => {
  try {
    const response = await fetch("http://localhost:5050/tool-smith", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    })
    // Forward ZIP stream (not JSON!)
    if (!response.ok) throw new Error("Failed to generate from ToolSmith API")
    res.set("Content-Disposition", response.headers.get("content-disposition"))
    res.set("Content-Type", "application/zip")
    response.body.pipe(res)
  } catch (err) {
    res.status(500).json({ error: "ToolSmith backend error", details: err.message })
  }
})

// --- ToolSmith: Upload ZIP to Python API.py ---
const FormData = require("form-data")

// --- ToolSmith: Upload ZIP to Python API.py ---
app.post("/api/toolsmith-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" })

    // Use form-data NPM package (not browser FormData)
    const formData = new FormData()
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "application/zip",
    })

    const response = await fetch("http://localhost:5050/grader-upload", {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(), // This is very important!
    })

    const resultText = await response.text()
    res.json({ status: resultText })
  } catch (err) {
    res.status(500).json({ error: "Failed to upload to ToolSmith backend", details: err.message })
  }
})

apiRouter.get("/progress/:userId", (req, res) => {
  const { userId } = req.params
  db.all(`SELECT problem_id FROM user_progress WHERE user_id = ?`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error on fetch" })
    const completed = rows.map((row) => row.problem_id)
    res.json({ completed })
  })
})

apiRouter.get("/leaderboard", (req, res) => {
  const sql = `
        SELECT users.username, COUNT(user_progress.problem_id) AS solved, COUNT(user_progress.problem_id)*10 AS points
        FROM users
        LEFT JOIN user_progress ON users.id = user_progress.user_id
        GROUP BY users.id
        ORDER BY solved DESC, users.username ASC
        LIMIT 50
    `
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error." })
    res.json({ leaderboard: rows })
  })
})

apiRouter.get("/submissions/:userId", (req, res) => {
  const { userId } = req.params
  db.all(
    `SELECT id, problem_id as problemId, language, status, timestamp FROM submissions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error." })
      res.json({ submissions: rows })
    },
  )
})

apiRouter.get("/is-evaluating/:userId/:problemId", (req, res) => {
  const { userId, problemId } = req.params
  db.get(
    `SELECT id FROM submissions WHERE user_id = ? AND problem_id = ? AND status = 'Evaluating' LIMIT 1`,
    [userId, problemId],
    (err, row) => {
      if (err) return res.status(500).json({ evaluating: false, error: "Database error" })
      res.json({ evaluating: !!row })
    },
  )
})

apiRouter.get("/latest-submission/:userId/:problemId", (req, res) => {
  const { userId, problemId } = req.params
  db.get(
    `SELECT id, status FROM submissions WHERE user_id = ? AND problem_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [userId, problemId],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" })
      res.json(row || {})
    },
  )
})

apiRouter.get("/submission-result/:submissionId", (req, res) => {
  // Now returns stored verdicts if available
  const { submissionId } = req.params
  db.get(`SELECT judge0_results FROM submissions WHERE id = ?`, [submissionId], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" })
    if (row && row.judge0_results) {
      try {
        return res.json({ results: JSON.parse(row.judge0_results) })
      } catch (e) {
        return res.json({ results: [] })
      }
    }
    res.json({ results: [] })
  })
})

apiRouter.get("/submission/:submissionId", (req, res) => {
  const { submissionId } = req.params
  db.get(
    `SELECT id, problem_id as problemId, language, status, timestamp, source_code FROM submissions WHERE id = ?`,
    [submissionId],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" })
      if (!row) return res.status(404).json({ error: "Submission not found" })
      res.json(row)
    },
  )
})

// Add a role verification endpoint:
apiRouter.get("/verify-role/:userId", (req, res) => {
  const { userId } = req.params
  db.get(`SELECT role FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" })
    if (!user) return res.status(404).json({ error: "User not found" })
    res.json({ role: user.role || "user" })
  })
})

// --- Mount the API router ---
app.use("/api", apiRouter)

// --- Root Route for Health Check ---
app.get("/", (req, res) => {
  const bangkokTime = new Date().toLocaleString("en-US", {
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

  res.send(`
    <h1>🟢 GraderSmiths Backend is Running!</h1>
    <p>Authentication and other endpoints are active.</p>
    <p><strong>Server Time (Bangkok GMT+7):</strong> ${bangkokTime}</p>
  `)
})

app.use(
  "/searchsmith-api",
  createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: { "^/searchsmith-api": "" },
  }),
)

// --- Start Server ---
app.listen(PORT, "0.0.0.0", () => {
  const bangkokTime = new Date().toLocaleString("en-US", {
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

  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`🕐 Server timezone set to Bangkok (GMT+7): ${bangkokTime}`)
})
