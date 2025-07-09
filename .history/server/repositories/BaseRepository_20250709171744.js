class BaseRepository {
  /**
   * The constructor must accept both the supabase client and the table name.
   * @param {object} supabase - The Supabase client instance.
   * @param {string} tableName - The name of the database table.
   */
  constructor(supabase, tableName) {
    if (!supabase || !tableName) {
      throw new Error('Supabase client and table name must be provided to BaseRepository.');
    }
    this.supabase = supabase;
    this.tableName = tableName;
  }

  // Generic methods like getAll, getById, create, etc., can go here
  // and they will use this.supabase and this.tableName.

  async getAll() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*');
    if (error) {
      console.error(`[BaseRepository] Error fetching all from ${this.tableName}:`, error);
      throw error;
    }
    return data;
  }

  async getById(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      // It's okay if no record is found (PGRST116), so we don't log that as an error.
      if (error.code !== 'PGRST116') {
        console.error(`[BaseRepository] Error fetching by ID from ${this.tableName}:`, error);
      }
      // Return null if not found or on error
      return null;
    }
    return data;
  }
  
  async create(entity) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(entity)
      .select()
      .single();
    if (error) {
      console.error(`[BaseRepository] Error creating in ${this.tableName}:`, error);
      throw error;
    }
    return data;
  }
}

module.exports = BaseRepository;