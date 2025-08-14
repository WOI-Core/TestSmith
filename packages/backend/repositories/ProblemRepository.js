// server/repositories/ProblemRepository.js
const BaseRepository = require('./BaseRepository');
const { slugifyTaskName } = require('common');

class ProblemRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'problems');
    }

    async getAll() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding')
            .order('problem_id', { ascending: true });

        if (error) {
            console.error('Error fetching all problems:', error.message);
            throw error;
        }

        return data;
    }

    async getById(problemId) {
        // Ensure consistent naming
        const cleanId = slugifyTaskName(problemId);
        
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding')
            .eq('problem_id', cleanId)
            .single();

        if (error) {
            if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
                return null;
            }
            console.error('Error fetching problem by ID:', error.message);
            throw error;
        }

        return data;
    }

    async create(problemData) {
        // Ensure consistent naming
        const { problem_id, name, difficulty } = problemData;
        const cleanId = slugifyTaskName(problem_id || problemData.id || name);
        
        // Check if already exists
        if (cleanId) {
            const existing = await this.getById(cleanId);
            if (existing) {
                return existing;
            }
        }
        
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert([{ 
                    problem_id: cleanId,
                    problem_name: name, 
                    difficulty,
                    is_tagged: false,
                    tags: null,
                    embedding: null
                }]);

            if (error) {
                // Handle duplicate key constraint violation (PostgreSQL error code 23505)
                if (error.code === '23505' || error.message.includes('duplicate key')) {
                    console.log(`[CREATE] Duplicate key detected for problem_id: ${cleanId}, returning existing record`);
                    // Return the existing record instead of throwing an error
                    return await this.getById(cleanId);
                }
                console.error('Supabase Create Error:', error);
                throw new Error('Failed to create problem in database.');
            }
            return data;
        } catch (insertError) {
            // Handle any other constraint violations or errors
            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                console.log(`[CREATE] Duplicate key detected for problem_id: ${cleanId}, returning existing record`);
                return await this.getById(cleanId);
            }
            throw insertError;
        }
    }

    async createFromBucket(problemData) {
        // Ensure consistent naming
        const { problem_id, name, difficulty } = problemData;
        const cleanId = slugifyTaskName(problem_id);
        
        // Check if already exists
        const existing = await this.getById(cleanId);
        if (existing) {
            return existing;
        }
        
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert([{ 
                    problem_id: cleanId,
                    problem_name: name, 
                    difficulty,
                    is_tagged: false,
                    tags: null,
                    embedding: null
                }]);

            if (error) {
                // Handle duplicate key constraint violation (PostgreSQL error code 23505)
                if (error.code === '23505' || error.message.includes('duplicate key')) {
                    console.log(`[CREATE_FROM_BUCKET] Duplicate key detected for problem_id: ${cleanId}, returning existing record`);
                    // Return the existing record instead of throwing an error
                    return await this.getById(cleanId);
                }
                console.error('Supabase CreateFromBucket Error:', error);
                throw new Error('Failed to create problem from bucket metadata in database.');
            }
            return data;
        } catch (insertError) {
            // Handle any other constraint violations or errors
            if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                console.log(`[CREATE_FROM_BUCKET] Duplicate key detected for problem_id: ${cleanId}, returning existing record`);
                return await this.getById(cleanId);
            }
            throw insertError;
        }
    }

    async findUntagged() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding')
            .eq('is_tagged', false);

        if (error) {
            console.error('Supabase FindUntagged Error:', error);
            throw new Error('Failed to find untagged problems.');
        }
        return data;
    }

    async updateProblem(problemId, updates) {
        // Ensure consistent naming
        const cleanId = slugifyTaskName(problemId);
        
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updates)
            .eq('problem_id', cleanId)
            .select()
            .single();

        if (error) {
            console.error('Supabase Update Problem Error:', error);
            throw new Error('Failed to update problem in database.');
        }
        return data;
    }

    async getByName(problemName) {
        // Ensure consistent naming
        const cleanName = slugifyTaskName(problemName);
        
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('problem_id, problem_name, difficulty, is_tagged, tags, embedding')
            .eq('problem_name', cleanName)
            .single();

        if (error) {
            if (error.code === 'PGRST116' && error.details === 'The result contains 0 rows') {
                return null;
            }
            console.error('Error fetching problem by name:', error.message);
            throw error;
        }

        return data;
    }

    async cleanupDuplicateRecords() {
        try {
            // Find and remove duplicate records, keeping the one with the most complete data
            const { data, error } = await this.supabase
                .rpc('cleanup_duplicate_problems');

            if (error) {
                console.error('Error cleaning up duplicate records:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Failed to cleanup duplicate records:', error);
            throw error;
        }
    }

    async deleteById(id) {
        // Ensure consistent naming
        const cleanId = slugifyTaskName(id);
        
        // Example for Supabase/Postgres
        const { data, error } = await this.supabase
            .from('problems')
            .delete()
            .eq('problem_id', cleanId);

        if (error) throw new Error(error.message);
        return data;
    }
}

module.exports = ProblemRepository;