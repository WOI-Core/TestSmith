class BaseRepository {
  constructor(supabase, tableName) {
    if (!supabase || !tableName) {
      throw new Error('Supabase client and table name must be provided to BaseRepository.');
    }
    this.supabase = supabase;
    this.tableName = tableName;
  }

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
      if (error.code !== 'PGRST116') {
        console.error(`[BaseRepository] Error fetching by ID from ${this.tableName}:`, error);
      }
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