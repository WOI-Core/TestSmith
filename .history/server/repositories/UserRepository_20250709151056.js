/**
 * User Repository
 * Handles all database operations related to users
 */
const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users'); // This calls the constructor of BaseRepository
  }

  /**
   * Find a user by their username or email
   */
  async findByUsernameOrEmail(username, email) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle(); // .maybeSingle() returns one record or null, preventing errors

    if (error) {
      console.error('[UserRepository] Error finding user:', error);
    }
    return data;
  }

  /**
   * Create a new user in the database
   */
  async createUser(id, username, email, hashedPassword) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([
        {
          id: id, // Make sure to insert the user's auth ID
          username: username,
          email: email,
          password_hash: hashedPassword,
          role: 'user', // Default role
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[UserRepository] Error creating user:', error);
    }
    return data;
  }
}

module.exports = new UserRepository();