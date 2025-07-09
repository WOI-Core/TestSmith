const BaseRepository = require('./BaseRepository');

class ProblemRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'problems');
    }

    async getAll() {
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

    async create(problemData) {
        const { problem_name, statement, solution, difficulty } = problemData;
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{ 
                name, 
                statement, 
                solution, 
                difficulty,
                is_tagged: false
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase Create Error:', error);
            throw new Error('Failed to create problem in database.');
        }
        return data;
    }

    async findUntagged() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('is_tagged', false);

        if (error) {
            console.error('Supabase FindUntagged Error:', error);
            throw new Error('Failed to find untagged problems.');
        }
        return data;
    }

    async markAsTagged(problemId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({ is_tagged: true })
            .eq('id', problemId);

        if (error) {
            console.error('Supabase MarkAsTagged Error:', error);
            throw new Error('Failed to update problem status.');
        }
        return data;
    }
}

module.exports = ProblemRepository;
