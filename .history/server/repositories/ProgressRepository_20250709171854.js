const BaseRepository = require('./BaseRepository');

class ProgressRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'submissions');
    }

    async getUserProgress(userId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status_id', 4);

        if (error) {
            console.error('[ProgressRepository] Error fetching user progress:', error);
            throw error;
        }

        return { problems_solved: data ? data.length : 0 };
    }

    async getLeaderboard() {
        const { data, error } = await this.supabase.rpc('get_leaderboard_data');

        if (error) {
            console.error('[ProgressRepository] Error fetching leaderboard:', error);
            throw error;
        }

        return data;
    }
}

module.exports = ProgressRepository;