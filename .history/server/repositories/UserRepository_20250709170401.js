const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  /**
   * The constructor now accepts the supabase client
   * and passes it to the parent class.
   */
  constructor(supabase) {
    super(supabase, 'users');
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
  async getById(userId) {
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
  async create(userData) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([userData])
      .select()
      .single();

    if (error) {
      // Log the full error for better debugging
      console.error('[UserRepository] Error creating user:', error);
    }
    return data;
  }
}

// Export the class, not an instance of it.
module.exports = UserRepository;