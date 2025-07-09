// server/controllers/ProblemController.js
const ProblemRepository = require('../repositories/ProblemRepository');
const supabase = require('../config/database');
const axios = require('axios');
const SupabaseService = require('../services/SupabaseService');

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
                const problemNameForFiles = problemData.name; // Use the submitted name for file naming
                
                await supabaseService.uploadProblemFiles(
                    newProblem.problem_id, // problemId for folder
                    problemNameForFiles, // problemName for file naming
                    problemData.statement,
                    problemData.solution // solution content
                );
                
                const configContent = JSON.stringify({
                    title: problemData.name,
                    timeLimit: problemData.timeLimit || 1000,
                    memoryLimit: problemData.memoryLimit || 256,
                    difficulty: problemData.difficulty,
                    note: problemData.note || "No specific notes."
                }, null, 2);
                await supabaseService.uploadProblemConfig(newProblem.problem_id, configContent);

            } else {
                console.warn('Problem created in DB but problem_id was not returned, skipping file upload.');
            }

            res.status(201).json(newProblem);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemsFromStorage(req, res, next) {
        try {
            const supabaseService = new SupabaseService();
            const problems = await supabaseService.getProblemList();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemDetailsFromStorage(req, res, next) {
        try {
            const { problem_id } = req.params;
            const supabaseService = new SupabaseService();

            const configContent = await supabaseService.downloadProblemFile(problem_id, 'config.json');
            if (!configContent) {
                return res.status(404).json({ message: `Config file not found for problem ID: ${problem_id}` });
            }
            const problemConfig = JSON.parse(configContent);
            const problemNameFromConfig = problemConfig.title;

            // Download markdown and solution using the problem name and new download logic
            const markdownContent = await supabaseService.downloadProblemFile(problem_id, `${problemNameFromConfig}.md`, false); // false for not solution
            const solutionCode = await supabaseService.downloadProblemFile(problem_id, `${problemNameFromConfig}.cpp`, true); // true for solution

            res.status(200).json({
                id: problem_id,
                name: problemNameFromConfig,
                statement: markdownContent,
                solution: solutionCode,
                difficulty: problemConfig.difficulty,
                timeLimit: problemConfig.timeLimit,
                memoryLimit: problemConfig.memoryLimit,
                note: problemConfig.note,
                tags: problemConfig.tags || []
            });

        } catch (error) {
            console.error('[Get Problem Details From Storage Error]', error.message);
            next(new Error("Failed to retrieve problem details from storage."));
        }
    }

    static async syncWithSearchsmith(req, res, next) {
        try {
            const { problem_name, markdown_content, solution_code, problem_id } = req.body;
            const problemRepo = new ProblemRepository(supabase);

            let searchsmithResponse;
            try {
                searchsmithResponse = await axios.post('http://localhost:8000/v1/update-database', {
                    problem_name,
                    markdown_content: markdown_content,
                    solution_code: solution_code
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

            const { tags, embedding } = searchsmithResponse.data.result || {};

            await problemRepo.updateProblem(problem_id, {
                is_tagged: true,
                tags: tags || [],
                embedding: embedding || null
            });

            res.status(200).json(searchsmithResponse.data);

        } catch (error) {
            console.error('[Sync Error]', error.message);
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;