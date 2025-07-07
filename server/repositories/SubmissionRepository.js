/**
 * Submission Repository
 * Handles all submission-related database operations
 */
const BaseRepository = require("./BaseRepository")
const config = require("../config")

class SubmissionRepository extends BaseRepository {
  constructor() {
    super("submissions")
  }

  /**
   * Create new submission with timezone support
   */
  async createSubmission(submissionData) {
    const submissionWithTimestamp = {
      ...submissionData,
      timestamp: this.getBangkokTimestamp(),
    }

    return await this.create(submissionWithTimestamp)
  }

  /**
   * Get submissions by user ID
   */
  async getByUserId(userId, limit = 50) {
    const sql = `
      SELECT id, problem_id as problemId, language, status, timestamp 
      FROM ${this.tableName} 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `

    return await this.query(sql, [userId, limit])
  }

  /**
   * Get submission with full details
   */
  async getSubmissionDetails(submissionId) {
    const sql = `
      SELECT id, problem_id as problemId, language, status, timestamp, source_code
      FROM ${this.tableName} 
      WHERE id = ?
    `

    return await this.queryOne(sql, [submissionId])
  }

  /**
   * Get submission results (judge0 data)
   */
  async getSubmissionResults(submissionId) {
    const sql = `SELECT judge0_results FROM ${this.tableName} WHERE id = ?`
    const result = await this.queryOne(sql, [submissionId])

    if (result && result.judge0_results) {
      try {
        return JSON.parse(result.judge0_results)
      } catch (e) {
        console.error("Failed to parse judge0_results:", e)
        return null
      }
    }

    return null
  }

  /**
   * Update submission status and results
   */
  async updateSubmissionResults(submissionId, status, results = null) {
    const updateData = { status }

    if (results) {
      updateData.judge0_results = JSON.stringify(results)
    }

    return await this.updateById(submissionId, updateData)
  }

  /**
   * Check if user has evaluating submission for problem
   */
  async hasEvaluatingSubmission(userId, problemId) {
    const sql = `
      SELECT id FROM ${this.tableName} 
      WHERE user_id = ? AND problem_id = ? AND status = 'Evaluating' 
      LIMIT 1
    `

    const result = await this.queryOne(sql, [userId, problemId])
    return !!result
  }

  /**
   * Get latest submission for user and problem
   */
  async getLatestSubmission(userId, problemId) {
    const sql = `
      SELECT id, status 
      FROM ${this.tableName} 
      WHERE user_id = ? AND problem_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `

    return await this.queryOne(sql, [userId, problemId])
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

module.exports = new SubmissionRepository()
