// server/repositories/ProblemRepository.js
const BaseRepository = require('./BaseRepository');

class ProblemRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'problems');
    }

    async getAll() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding_vector')
            .order('problem_id', { ascending: true });

        if (error) {
            console.error('Error fetching all problems:', error.message);
            throw error;
        }

        return data;
    }

    async getById(problemId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding_vector')
            .eq('problem_id', problemId)
            .single();

        if (error) {
            // If no rows are returned, Supabase throws an error. Catch it and return null or throw a specific error.
            if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
                return null; // Problem not found
            }
            console.error('Error fetching problem by ID:', error.message);
            throw error;
        }

        return data;
    }

    async create(problemData) {
        const { name, difficulty } = problemData;
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{ 
                problem_name: name, 
                difficulty,
                is_tagged: false,
                tags: null,
                embedding_vector: null
            }]);

        if (error) {
            console.error('Supabase Create Error:', error);
            throw new Error('Failed to create problem in database.');
        }
        return data;
    }

    // New method to create a problem with a pre-defined problem_id (from bucket)
    async createFromBucket(problemData) {
        const { problem_id, name, difficulty } = problemData;
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{ 
                problem_id: problem_id, // Use the provided problem_id
                problem_name: name, 
                difficulty,
                is_tagged: false,
                tags: null,
                embedding_vector: null
            }]);

        if (error) {
            console.error('Supabase CreateFromBucket Error:', error);
            throw new Error('Failed to create problem from bucket metadata in database.');
        }
        return data;
    }

    async findUntagged() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding_vector')
            .eq('is_tagged', false);

        if (error) {
            console.error('Supabase FindUntagged Error:', error);
            throw new Error('Failed to find untagged problems.');
        }
        return data;
    }

    async updateProblem(problemId, updates) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updates)
            .eq('problem_id', problemId)
            .select()
            .single();

        if (error) {
            console.error('Supabase Update Problem Error:', error);
            throw new Error('Failed to update problem in database.');
        }
        return data;
    }
}

module.exports = ProblemRepository;