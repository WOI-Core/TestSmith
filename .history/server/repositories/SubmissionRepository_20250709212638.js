const BaseRepository = require('./BaseRepository');

class SubmissionRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'submissions');
  }

  async getByUserId(userId) {
    // This query no longer joins with the 'problems' table.
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        id,
        problem_id,
        language_id,
        status_id,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions by user ID:', error);
      throw new Error(`Error fetching submissions by user ID: ${error.message}`);
    }

    return data;
  }

  async getById(submissionId) {
    // This query also no longer joins with 'problems'.
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching submission by ID:', error);
        throw error;
    }

    return data;
  }
}

module.exports = SubmissionRepository;