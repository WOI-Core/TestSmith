const ProblemRepository = require('../repositories/ProblemRepository');
const supabase = require('../config/database');
const axios = require('axios');
const SupabaseService = require('../services/SupabaseService'); // Import SupabaseService

class ProblemController {
    static async getAllProblems(req, res, next) {
        try {
            const problemRepo = new ProblemRepository(supabase);
            const problems = await problemRepo.getAll();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemById(req, res, next) {
        try {
            const { id } = req.params;
            const problemRepo = new ProblemRepository(supabase);
            const problem = await problemRepo.getById(id);
            res.status(200).json(problem);
        } catch (error) {
            next(error);
        }
    }
    
    static async searchProblems(req, res, next) {
        res.status(404).json({ message: "Search endpoint should be proxied to SearchSmith service." });
    }

    static async createProblem(req, res, next) {
        try {
            const problemData = req.body;
            const problemRepo = new ProblemRepository(supabase);
            const supabaseService = new SupabaseService();

            const newProblem = await problemRepo.create(problemData);
            
            if (newProblem && newProblem.problem_id) {
                await supabaseService.uploadProblemFiles(
                    newProblem.problem_id,
                    problemData.statement,
                    problemData.solution
                );
            } else {
                console.warn('Problem created in DB but problem_id was not returned, skipping file upload.');
            }

            res.status(201).json(newProblem);
        } catch (error) {
            next(error);
        }
    }

    static async getUntaggedProblems(req, res, next) {
        try {
            const problemRepo = new ProblemRepository(supabase);
            const problems = await problemRepo.findUntagged();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    static async syncWithSearchsmith(req, res, next) {
        try {
            const { problem_name, problem_id } = req.body; // Only problem_name and problem_id are needed from req.body
            const problemRepo = new ProblemRepository(supabase);
            const supabaseService = new SupabaseService(); // Instantiate SupabaseService

            // Download markdown content and solution code from Supabase Storage
            const markdownContent = await supabaseService.downloadProblemFile(problem_id, 'statement.md');
            const solutionCode = await supabaseService.downloadProblemFile(problem_id, 'solution.txt');

            if (!markdownContent || !solutionCode) {
                throw new Error(`Failed to retrieve problem files for problem ID: ${problem_id} from storage.`);
            }

            let searchsmithResponse;
            try {
                searchsmithResponse = await axios.post('http://localhost:8000/v1/update-database', {
                    problem_name,
                    markdown_content: markdownContent, // Use content from bucket
                    solution_code: solutionCode // Use content from bucket
                });
            } catch (axiosError) {
                if (axiosError.response) {
                    console.error('Error response from SearchSmith:', axiosError.response.data);
                    console.error('Error response status:', axiosError.response.status);
                } else if (axiosError.request) {
                    console.error('No response received from SearchSmith:', axiosError.request);
                } else {
                    console.error('Error setting up SearchSmith request:', axiosError.message);
                }
                throw new Error("Failed to sync with SearchSmith service due to API error.");
            }
            
            if (searchsmithResponse.status !== 200) {
                console.error('SearchSmith service returned non-200 status:', searchsmithResponse.status);
                console.error('SearchSmith response data:', searchsmithResponse.data);
                throw new Error('SearchSmith service returned an unexpected status.');
            }

            const { tags, embedding_vector } = searchsmithResponse.data.result || {};

            await problemRepo.updateProblem(problem_id, {
                is_tagged: true,
                tags: tags || [],
                embedding_vector: embedding_vector || null
            });

            res.status(200).json(searchsmithResponse.data);

        } catch (error) {
            console.error('[Sync Error]', error.message);
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;
