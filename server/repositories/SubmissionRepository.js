// Step 1: Import the BaseRepository from its own file.
const BaseRepository = require('./BaseRepository');

/**
 * The SubmissionRepository class handles database operations for the 'submissions' table.
 * It extends the generic BaseRepository to reuse common database logic.
 */
class SubmissionRepository extends BaseRepository {
  constructor(supabase) {
    // Step 2: Pass the supabase client and the table name 'submissions' to the parent class.
    super(supabase, 'submissions');
  }

  /**
   * Creates a new submission, mapping application-style names to database-style names.
   * @param {object} submissionData - Data from the service, e.g., { userId, problemId, ... }
   * @returns {Promise<object>} The newly created submission.
   */
  async create(submissionData) {
    // Step 3: Create a new object with database-correct column names (snake_case).
    const dataToInsert = {
      user_id: submissionData.userId,
      problem_id: submissionData.problemId,
      language: submissionData.language,
      source_code: submissionData.sourceCode,
      status: submissionData.status || 'pending',
    };

    // Step 4: Call the parent's create method with the correctly formatted data.
    return super.create(dataToInsert);
  }

  /**
   * Finds submissions by a user's ID.
   * @param {string} userId - The UUID of the user.
   * @returns {Promise<Array<object>>} A list of submissions for the user.
   */
  async findByUserId(userId) {
    // The column name in the database is 'user_id'.
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
        console.error(`[SubmissionRepository] Error in findByUserId:`, error);
        throw error;
    }
    return data;
  }
}

module.exports = SubmissionRepository;
