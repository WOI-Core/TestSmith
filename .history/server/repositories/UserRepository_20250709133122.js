/**
 * User Repository
 * Handles all user-related database operations with Supabase
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
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116: 0 rows
    return data
  }

  // ... (other user-specific methods can be added here)
}

module.exports = new UserRepository()