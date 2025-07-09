/**
 * User Repository
 * Handles all database operations related to users
 */
const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find a user by their username or email
   */
  async findByUsernameOrEmail(username, email) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (error) {
      console.error('[UserRepository] Error finding user:', error);
    }
    return data;
  }

  /**
   * Find a user by their ID
   */
  async findById(userId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Don't log "not found" errors
      console.error('[UserRepository] Error finding user by ID:', error);
    }
    return data;
  }

  /**
   * Create a new user in the database
   */
  async createUser(id, username, email) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([{ id, username, email, role: 'user' }])
      .select()
      .single();

    if (error) {
      console.error('[UserRepository] Error creating user:', error);
    }
    return data;
  }
}

module.exports = new UserRepository();
