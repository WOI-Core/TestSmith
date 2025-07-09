const BaseRepository = require('./BaseRepository');

class SubmissionRepository extends BaseRepository {
    constructor(supabase) {
        super(supabase, 'submissions');
    }

    async getByUserId(userId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select(`
                *,
                problems (
                    name
                ),
                programming_languages (
                    name
                ),
                submission_statuses (
                    name
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching submissions by user ID:', error.message);
            throw error;
        }

        return data;
    }

    async getById(submissionId) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select(`
                *,
                problems (
                    name,
                    description
                ),
                programming_languages (
                    name
                ),
                submission_statuses (
                    name
                )
            `)
            .eq('id', submissionId)
            .single();

        if (error) {
            console.error('Error fetching submission by ID:', error.message);
            throw error;
        }

        return data;
    }
}

module.exports = SubmissionRepository;