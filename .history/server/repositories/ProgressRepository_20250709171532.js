const BaseRepository = require('./BaseRepository');

class ProgressRepository extends BaseRepository {
    /**
     * The constructor now accepts the supabase client
     * and passes it to the parent class.
     */
    constructor(supabase) {
        super(supabase, 'submissions'); // Assuming progress is derived from submissions
    }

    /**
     * Gets a user's progress, typically by counting their successful submissions.
     */
    async getUserProgress(userId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status_id', 4); // Assuming 4 is the ID for "Accepted"

        if (error) {
            console.error('[ProgressRepository] Error fetching user progress:', error);
            throw error;
        }

        return { problems_solved: data ? data.length : 0 };
    }

    /**
     * Gets leaderboard data by calling a database function.
     * This is more efficient than calculating ranks in the application.
     */
    async getLeaderboard() {
        // It's best practice to create a database function (e.g., get_leaderboard)
        // to handle the ranking logic efficiently.
        const { data, error } = await this.supabase.rpc('get_leaderboard');

        if (error) {
            console.error('[ProgressRepository] Error fetching leaderboard:', error);
            throw error;
        }

        return data;
    }
}

// Export the class itself, not an instance
module.exports = ProgressRepository;