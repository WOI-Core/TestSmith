const BaseRepository = require('./BaseRepository');

class ProblemRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'problems');
    }

    async getAll() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, markdown_content, solution_code, difficulty, is_tagged, tags, embedding')
            .order('problem_id', { ascending: true }); // Changed 'id' to 'problem_id'

        if (error) {
            console.error('Error fetching all problems:', error.message);
            throw error;
        }

        return data;
    }

    async getById(problemId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, markdown_content, solution_code, difficulty, is_tagged, tags, embedding')
            .eq('problem_id', problemId) // Changed 'id' to 'problem_id'
            .single();

        if (error) {
            console.error('Error fetching problem by ID:', error.message);
            throw error;
        }

        return data;
    }

    async create(problemData) {
        const { name, statement, solution, difficulty } = problemData;
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert([{ 
                problem_name: name, 
                markdown_content: statement, 
                solution_code: solution, 
                difficulty,
                is_tagged: false,
                tags: null,
                embedding: null
            }]);

        if (error) {
            console.error('Supabase Create Error:', error);
            throw new Error('Failed to create problem in database.');
        }
        return data;
    }

    async findUntagged() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, markdown_content, solution_code, difficulty, is_tagged, tags, embedding') // Changed 'id' to 'problem_id'
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
            .eq('problem_id', problemId) // Changed 'id' to 'problem_id'
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
