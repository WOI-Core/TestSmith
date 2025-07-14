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

    // Add enhanced fields only if they exist in the database
    try {
      // Try to add enhanced fields
      if (submissionData.test_results !== undefined) dataToInsert.test_results = submissionData.test_results;
      if (submissionData.total_test_cases !== undefined) dataToInsert.total_test_cases = submissionData.total_test_cases;
      if (submissionData.passed_test_cases !== undefined) dataToInsert.passed_test_cases = submissionData.passed_test_cases;
      if (submissionData.execution_time !== undefined) dataToInsert.execution_time = submissionData.execution_time;
      if (submissionData.memory_used !== undefined) dataToInsert.memory_used = submissionData.memory_used;
      if (submissionData.error_message !== undefined) dataToInsert.error_message = submissionData.error_message;
    } catch (error) {
      // If enhanced fields don't exist, just use basic fields
      console.log('[SubmissionRepository] Enhanced fields not available, using basic schema');
    }

    // Step 4: Call the parent's create method with the correctly formatted data.
    return super.create(dataToInsert);
  }

  /**
   * Updates a submission with enhanced evaluation data.
   * @param {string} submissionId - The ID of the submission to update.
   * @param {object} updateData - The data to update.
   * @returns {Promise<object>} The updated submission.
   */
  async update(submissionId, updateData) {
    // Map camelCase to snake_case for database columns
    const dataToUpdate = {};
    
    // Always include basic fields
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    
    // Try to add enhanced fields, but don't fail if they don't exist
    try {
      if (updateData.test_results !== undefined) dataToUpdate.test_results = updateData.test_results;
      if (updateData.total_test_cases !== undefined) dataToUpdate.total_test_cases = updateData.total_test_cases;
      if (updateData.passed_test_cases !== undefined) dataToUpdate.passed_test_cases = updateData.passed_test_cases;
      if (updateData.execution_time !== undefined) dataToUpdate.execution_time = updateData.execution_time;
      if (updateData.memory_used !== undefined) dataToUpdate.memory_used = updateData.memory_used;
      if (updateData.error_message !== undefined) dataToUpdate.error_message = updateData.error_message;
    } catch (error) {
      console.log('[SubmissionRepository] Enhanced fields not available for update, using basic schema');
    }

    return super.update(submissionId, dataToUpdate);
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
        console.error(`[SubmissionRepository] Error in findByUserId:`, error);
        throw error;
    }
    return data;
  }

  /**
   * Finds a submission by its ID with all enhanced fields.
   * @param {string} submissionId - The ID of the submission to find.
   * @returns {Promise<object|null>} The submission object or null if not found.
   */
  async findById(submissionId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', submissionId)
      .single();
    
    if (error) {
        if (error.code === 'PGRST116') {
            // No rows returned
            return null;
        }
        console.error(`[SubmissionRepository] Error in findById:`, error);
        throw error;
    }
    return data;
  }
}

module.exports = SubmissionRepository;
