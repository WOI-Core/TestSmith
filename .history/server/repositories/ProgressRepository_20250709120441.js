/**
 * Progress Repository
 * Handles user progress tracking
 */
const BaseRepository = require("./BaseRepository")
const config = require("../config")

class ProgressRepository extends BaseRepository {
  constructor() {
    super("user_progress")
  }

  /**
   * Save user progress for a problem
   */
  async saveProgress(userId, problemId) {
    const completedTimestamp = this.getBangkokTimestamp()

    const sql = `
      INSERT OR REPLACE INTO ${this.tableName} (user_id, problem_id, completed_at) 
      VALUES (?, ?, ?)
    `

    return await this.execute(sql, [userId, problemId, completedTimestamp])
  }

  /**
   * Get user's completed problems
   */
  async getUserProgress(userId) {
    const sql = `SELECT problem_id FROM ${this.tableName} WHERE user_id = ?`
    const rows = await this.query(sql, [userId])
    return rows.map((row) => row.problem_id)
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit = 50) {
    const sql = `
      SELECT 
        users.username, 
        COUNT(user_progress.problem_id) AS solved, 
        COUNT(user_progress.problem_id) * 10 AS points
      FROM users
      LEFT JOIN user_progress ON users.id = user_progress.user_id
      GROUP BY users.id
      ORDER BY solved DESC, users.username ASC
      LIMIT ?
    `

    return await this.query(sql, [limit])
  }

  /**
   * Get Bangkok timestamp
   */
  getBangkokTimestamp() {
    return new Date()
      .toLocaleString("sv-SE", {
        timeZone: config.timezone.default,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(" ", "T")
  }
}

module.exports = new ProgressRepository()
