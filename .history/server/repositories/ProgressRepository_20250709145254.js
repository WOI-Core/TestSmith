/**
 * Progress Repository
 * Handles user progress tracking
 */
const BaseRepository = require("./BaseRepository");
const config = require("../config");

class ProgressRepository extends BaseRepository {
  constructor() {
    // Pass the Supabase client from BaseRepository to this class instance
    super("user_progress");
  }

  /**
   * Save user progress for a problem.
   * Uses upsert to either insert a new record or update an existing one.
   */
  async saveProgress(userId, problemId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(
        {
          user_id: userId,
          problem_id: problemId,
          completed_at: this.getBangkokTimestamp(),
        },
        {
          // This assumes you have a unique constraint on (user_id, problem_id)
          // to prevent duplicate entries for the same user and problem.
          onConflict: 'user_id, problem_id'
        }
      );

    if (error) {
      console.error("[ProgressRepository] Error saving progress:", error);
    }
    return data;
  }

  /**
   * Get user's completed problems
   */
  async getUserProgress(userId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('problem_id')
      .eq('user_id', userId);

    if (error) {
      console.error("[ProgressRepository] Error fetching user progress:", error);
      return [];
    }
    return data.map((row) => row.problem_id);
  }

  /**
   * Get leaderboard data by calling the database function
   */
  async getLeaderboard(limit = 50) {
    const { data, error } = await this.supabase.rpc('get_leaderboard_data', {
      limit_count: limit
    });

    if (error) {
        console.error('[ProgressRepository] Error fetching leaderboard:', error);
        return [];
    }
    return data;
  }

  /**
   * Get Bangkok timestamp
   */
  getBangkokTimestamp() {
    return new Date()
      .toLocaleString("sv-SE", {
        timeZone: config.timezone.default,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(" ", "T");
  }
}

module.exports = new ProgressRepository();