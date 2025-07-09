const BaseRepository = require("./BaseRepository")

class UserRepository extends BaseRepository {
  constructor() {
    super("users")
  }

  async findByUsernameOrEmail(identifier) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  }
}

module.exports = new UserRepository()