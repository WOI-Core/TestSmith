/**
 * User Repository
 * Handles all user-related database operations
 */
const BaseRepository = require("./BaseRepository")
const config = require("../config")

class UserRepository extends BaseRepository {
  constructor() {
    super("users")
  }

  /**
   * Find user by username or email
   */
  async findByUsernameOrEmail(identifier) {
    const sql = `SELECT * FROM ${this.tableName} WHERE username = ? OR email = ?`
    return await this.queryOne(sql, [identifier, identifier])
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const sql = `SELECT * FROM ${this.tableName} WHERE username = ?`
    return await this.queryOne(sql, [username])
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const sql = `SELECT * FROM ${this.tableName} WHERE email = ?`
    return await this.queryOne(sql, [email])
  }

  /**
   * Create new user with timezone support
   */
  async createUser(userData) {
    const userWithTimestamp = {
      ...userData,
      created_at: this.getBangkokTimestamp(),
    }

    return await this.create(userWithTimestamp)
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    const sql = `
      SELECT 
        u.username,
        u.email,
        u.role,
        u.created_at,
        COUNT(DISTINCT up.problem_id) as problems_solved,
        COUNT(DISTINCT s.id) as total_submissions,
        COUNT(DISTINCT CASE WHEN s.status = 'Accepted' THEN s.id END) as accepted_submissions
      FROM users u
      LEFT JOIN user_progress up ON u.id = up.user_id
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `

    return await this.queryOne(sql, [userId])
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

module.exports = new UserRepository()
