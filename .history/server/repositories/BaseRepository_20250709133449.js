const DatabaseManager = require("../config/database")

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName
    this.db = DatabaseManager.getDatabase()
  }

  async findById(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

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

  async create(data) {
    const { data: result, error } = await this.db
      .from(this.tableName)
      .insert(data)
      .select()
    if (error) throw error
    return result[0]
  }

  async updateById(id, data) {
    const { data: result, error } = await this.db
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
    if (error) throw error
    return result[0]
  }

  async deleteById(id) {
    const { error } = await this.db.from(this.tableName).delete().eq('id', id)
    if (error) throw error
    return true
  }
}

module.exports = BaseRepository