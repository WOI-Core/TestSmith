const BaseRepository = require('./BaseRepository');

class ProblemRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'problems');
    }

    async getAll() {
        // This query fetches all problems and can be expanded later
        // to include solver counts or other joined data.
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching all problems:', error.message);
            throw error;
        }

        return data;
    }

    async getById(problemId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', problemId)
            .single();

        if (error) {
            console.error('Error fetching problem by ID:', error.message);
            throw error;
        }

        return data;
    }
}

module.exports = ProblemRepository;