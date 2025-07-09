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
                const problemFileName = newProblem.problem_name || problemData.name;
                
                await supabaseService.uploadProblemFiles(
                    newProblem.problem_id,
                    `${problemFileName}.md`,
                    problemData.statement,
                    `${problemFileName}.txt`,
                    problemData.solution
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

            const markdownContent = await supabaseService.downloadProblemFile(problem_id, `${problemNameFromConfig}.md`);
            const solutionCode = await supabaseService.downloadProblemFile(problem_id, `${problemNameFromConfig}.cpp`);

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

            // Log data before sending to SearchSmith
            console.log('--- Sync with SearchSmith Initiated ---');
            console.log('Problem ID for sync:', problem_id);
            console.log('Payload for SearchSmith:');
            console.log('  problem_name:', problem_name);
            console.log('  markdown_content (first 100 chars):', markdown_content ? markdown_content.substring(0, 100) + '...' : 'N/A');
            console.log('  solution_code (first 100 chars):', solution_code ? solution_code.substring(0, 100) + '...' : 'N/A');

            let searchsmithResponse;
            try {
                searchsmithResponse = await axios.post('http://localhost:8000/v1/update-database', {
                    problem_name,
                    markdown_content: markdown_content,
                    solution_code: solution_code
                });
                console.log('SearchSmith API call successful.');
                console.log('SearchSmith Response Status:', searchsmithResponse.status);
                console.log('SearchSmith Response Data:', JSON.stringify(searchsmithResponse.data, null, 2));

            } catch (axiosError) {
                console.error('--- Error during SearchSmith API call ---');
                if (axiosError.response) {
                    console.error('Error response from SearchSmith (status):', axiosError.response.status);
                    console.error('Error response from SearchSmith (data):', JSON.stringify(axiosError.response.data, null, 2));
                    console.error('Error response from SearchSmith (headers):', axiosError.response.headers);
                } else if (axiosError.request) {
                    console.error('No response received from SearchSmith (request):', axiosError.request);
                } else {
                    console.error('Error setting up SearchSmith request (message):', axiosError.message);
                }
                throw new Error("Failed to sync with SearchSmith service due to API error.");
            }
            
            if (searchsmithResponse.status !== 200) {
                console.error('SearchSmith service returned non-200 status:', searchsmithResponse.status);
                console.error('SearchSmith response data:', searchsmithResponse.data);
                throw new Error('SearchSmith service returned an unexpected status.');
            }

            const { tags, embedding_vector } = searchsmithResponse.data.result || {};

            // Log data before updating Supabase table
            console.log('--- Updating Supabase Problem Table ---');
            console.log('Problem ID for update:', problem_id);
            const updates = {
                is_tagged: true,
                tags: tags || [],
                embedding_vector: embedding_vector || null
            };
            console.log('Updates object:', JSON.stringify(updates, null, 2));

            try {
                const updatedProblem = await problemRepo.updateProblem(problem_id, updates);
                console.log('Successfully updated problem metadata in Supabase table.');
                console.log('Updated problem record:', JSON.stringify(updatedProblem, null, 2));
            } catch (dbError) {
                console.error('--- Error updating Supabase Problem Table ---');
                console.error('Database update error message:', dbError.message);
                console.error('Database update error details:', dbError);
                throw new Error("Failed to update problem metadata in database after SearchSmith sync.");
            }

            res.status(200).json(searchsmithResponse.data);

        } catch (error) {
            console.error('--- Final Sync Error Caught ---');
            console.error('Overall Sync Error Message:', error.message);
            console.error('Overall Sync Error Stack:', error.stack);
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;