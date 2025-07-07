/**
 * Base Repository Class
 * Provides common database operations and utilities
 */
const DatabaseManager = require("../config/database")

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName
  }

  /**
   * Get database instance
   */
  getDb() {
    return DatabaseManager.getDatabase()
  }

  /**
   * Execute a query with parameters
   */
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.getDb().all(sql, params, (err, rows) => {
        if (err) {
          console.error(`Database query error in ${this.tableName}:`, err)
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  /**
   * Execute a query and return single row
   */
  async queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.getDb().get(sql, params, (err, row) => {
        if (err) {
          console.error(`Database query error in ${this.tableName}:`, err)
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  /**
   * Execute an insert/update/delete query
   */
  async execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.getDb().run(sql, params, function (err) {
        if (err) {
          console.error(`Database execution error in ${this.tableName}:`, err)
          reject(err)
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes,
          })
        }
      })
    })
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`
    return await this.queryOne(sql, [id])
  }

  /**
   * Find all records with optional conditions
   */
  async findAll(conditions = {}, orderBy = "id ASC", limit = null) {
    let sql = `SELECT * FROM ${this.tableName}`
    const params = []

    // Add WHERE conditions
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map((key) => `${key} = ?`)
        .join(" AND ")
      sql += ` WHERE ${whereClause}`
      params.push(...Object.values(conditions))
    }

    // Add ORDER BY
    sql += ` ORDER BY ${orderBy}`

    // Add LIMIT
    if (limit) {
      sql += ` LIMIT ?`
      params.push(limit)
    }

    return await this.query(sql, params)
  }

  /**
   * Create new record
   */
  async create(data) {
    const fields = Object.keys(data)
    const placeholders = fields.map(() => "?").join(", ")
    const sql = `INSERT INTO ${this.tableName} (${fields.join(", ")}) VALUES (${placeholders})`

    return await this.execute(sql, Object.values(data))
  }

  /**
   * Update record by ID
   */
  async updateById(id, data) {
    const fields = Object.keys(data)
    const setClause = fields.map((field) => `${field} = ?`).join(", ")
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`

    return await this.execute(sql, [...Object.values(data), id])
  }

  /**
   * Delete record by ID
   */
  async deleteById(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`
    return await this.execute(sql, [id])
  }
}

module.exports = BaseRepository
