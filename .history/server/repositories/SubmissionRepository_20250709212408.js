const BaseRepository = require('./BaseRepository');

class SubmissionRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'submissions');
  }

  async getByUserId(userId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        problems (
          id,
          name,
          difficulty
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions by user ID:', error.message);
      // The error message from the database will be more specific
      throw new Error(`Error fetching submissions by user ID: ${error.message}`);
    }

    return data;
  }

  async getById(submissionId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        problems (
          name,
          description
        )
      `)
      .eq('id', submissionId)
      .single();

    if (error) {
        if (error.code !== 'PGRST116') { // Ignore "not found" errors
            console.error('Error fetching submission by ID:', error.message);
        }
        return null;
    }

    return data;
  }
}

module.exports = SubmissionRepository;