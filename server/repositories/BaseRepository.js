/**
 * A generic repository for common CRUD operations to avoid repeating code.
 * This class is intended to be extended by other specific repositories.
 */
class BaseRepository {
  /**
   * @param {object} supabase - The Supabase client instance.
   * @param {string} tableName - The name of the database table.
   */
  constructor(supabase, tableName) {
    this.supabase = supabase;
    this.tableName = tableName;

    if (!this.supabase) {
      throw new Error('BaseRepository: Supabase client must be provided.');
    }
    if (!this.tableName) {
        throw new Error('BaseRepository: Table name must be provided.');
    }
  }

  /**
   * Creates a new record in the table.
   * @param {object} data - The data object for the new record.
   * @returns {Promise<object>} The newly created record.
   */
  async create(data) {
    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`[BaseRepository] Error creating in ${this.tableName}:`, error);
      throw error;
    }
    return result;
  }

  /**
   * Updates an existing record by its ID.
   * @param {*} id - The primary key of the record to update.
   * @param {object} dataToUpdate - An object containing the fields to update.
   * @returns {Promise<object>} The updated record.
   */
  async update(id, dataToUpdate) {
    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
        console.error(`[BaseRepository] Error updating record ${id} in ${this.tableName}:`, error);
        throw error;
    }
    return result;
  }

  /**
   * Retrieves all records from the table.
   * @returns {Promise<Array<object>>} An array of all records.
   */
  async getAll() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*');

    if (error) {
        console.error(`[BaseRepository] Error in getAll from ${this.tableName}:`, error);
        throw error;
    }
    return data;
  }

  /**
   * Finds a single record by its primary key ('id').
   * @param {*} id - The primary key of the record to find.
   * @returns {Promise<object|null>} The found record object, or null if not found.
   */
  async findById(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error(`[BaseRepository] Error in findById from ${this.tableName}:`, error);
        throw error;
    }
    return data;
  }
}

module.exports = BaseRepository;
