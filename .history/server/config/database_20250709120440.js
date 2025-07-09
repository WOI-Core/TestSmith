/**
 * Database Configuration and Connection Management
 * Handles SQLite database setup with proper error handling
 */
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const fs = require("fs")
const config = require("./index")

class DatabaseManager {
  constructor() {
    this.db = null
    this.isConnected = false
  }

  /**
   * Initialize database connection
   */
  async connect() {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(config.database.path)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // Create database connection
      this.db = new sqlite3.Database(config.database.path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          console.error("Database connection error:", err)
          throw err
        }
        console.log(`✅ Connected to SQLite database at ${config.database.path}`)
      })

      // Configure database settings
      await this.configurePragmas()

      // Run migrations
      await this.runMigrations()

      this.isConnected = true
      return this.db
    } catch (error) {
      console.error("Failed to initialize database:", error)
      throw error
    }
  }

  /**
   * Configure SQLite PRAGMA settings for optimal performance
   */
  async configurePragmas() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("PRAGMA foreign_keys = ON")
        this.db.run("PRAGMA journal_mode = WAL")
        this.db.run(`PRAGMA busy_timeout = ${config.database.options.busyTimeout}`)
        this.db.run(`PRAGMA synchronous = ${config.database.options.synchronous}`, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    })
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    const migrations = [
      this.createUsersTable.bind(this),
      this.createUserProgressTable.bind(this),
      this.createSubmissionsTable.bind(this),
      this.addTimezoneSupport.bind(this),
    ]

    for (const migration of migrations) {
      await migration()
    }
  }

  /**
   * Create users table
   */
  createUsersTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
          created_at TEXT DEFAULT (datetime('now', '${config.timezone.offset}'))
        )
      `

      this.db.run(sql, (err) => {
        if (err) reject(err)
        else {
          console.log("✅ Users table ready")
          resolve()
        }
      })
    })
  }

  /**
   * Create user progress table
   */
  createUserProgressTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS user_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          problem_id TEXT NOT NULL,
          completed_at TEXT DEFAULT (datetime('now', '${config.timezone.offset}')),
          UNIQUE(user_id, problem_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `

      this.db.run(sql, (err) => {
        if (err) reject(err)
        else {
          console.log("✅ User progress table ready")
          resolve()
        }
      })
    })
  }

  /**
   * Create submissions table
   */
  createSubmissionsTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          problem_id TEXT NOT NULL,
          language TEXT NOT NULL,
          status TEXT NOT NULL,
          timestamp TEXT DEFAULT (datetime('now', '${config.timezone.offset}')),
          source_code TEXT,
          judge0_results TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `

      this.db.run(sql, (err) => {
        if (err) reject(err)
        else {
          console.log("✅ Submissions table ready")
          resolve()
        }
      })
    })
  }

  /**
   * Add timezone support to existing tables
   */
  async addTimezoneSupport() {
    // This migration adds timezone columns if they don't exist
    // In a real application, you'd use a proper migration system
    return Promise.resolve()
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.isConnected) {
      throw new Error("Database not connected. Call connect() first.")
    }
    return this.db
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err)
          else {
            console.log("Database connection closed")
            this.isConnected = false
            resolve()
          }
        })
      })
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager()
