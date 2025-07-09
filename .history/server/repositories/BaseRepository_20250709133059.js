/**
 * Base Repository Class
 * Provides common database operations and utilities for Supabase
 */
const DatabaseManager = require("../config/database")

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName
    this.db = DatabaseManager.getDatabase()
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  /**
   * Find all records with optional conditions
   */
  async findAll(conditions = {}, orderBy = "id", ascending = true) {
    let query = this.db.from(this.tableName).select('*')
    if (Object.keys(conditions).length > 0) {
      query = query.match(conditions)
    }
    query = query.order(orderBy, { ascending })
    const { data, error } = await query
    if (error) throw error
    return data
  }

  /**
   * Create new record
   */
  async create(data) {
    const { data: result, error } = await this.db
      .from(this.tableName)
      .insert(data)
      .select()
    if (error) throw error
    return result[0]
  }

  /**
   * Update record by ID
   */
  async updateById(id, data) {
    const { data: result, error } = await this.db
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
    if (error) throw error
    return result[0]
  }

  /**
   * Delete record by ID
   */
  async deleteById(id) {
    const { error } = await this.db.from(this.tableName).delete().eq('id', id)
    if (error) throw error
    return true
  }
}

module.exports = BaseRepository