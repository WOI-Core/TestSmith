const ProblemRepository = require('../repositories/ProblemRepository');
const supabase = require('../config/database');
const axios = require('axios');

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
            const newProblem = await problemRepo.create(problemData);
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
            const { problem_name, markdown_content, solution_code, problem_id } = req.body;
            const problemRepo = new ProblemRepository(supabase);

            // Log the payload being sent to SearchSmith
            console.log("Attempting to sync with SearchSmith. Payload:");
            console.log("Problem Name:", problem_name);
            console.log("Markdown Content (first 100 chars):", markdown_content ? markdown_content.substring(0, 100) + '...' : 'N/A');
            console.log("Solution Code (first 100 chars):", solution_code ? solution_code.substring(0, 100) + '...' : 'N/A');
            console.log("Problem ID (for internal use, not sent to SearchSmith):", problem_id);

            const searchsmithResponse = await axios.post('http://localhost:8000/v1/update-database', {
                problem_name,
                markdown_content,
                solution_code
            });
            
            if (searchsmithResponse.status !== 200) {
                // If SearchSmith returns a non-200 status, log its response data for more details
                console.error('SearchSmith service returned non-200 status:', searchsmithResponse.status);
                console.error('SearchSmith error data:', searchsmithResponse.data);
                throw new Error('SearchSmith service returned an error.');
            }

            await problemRepo.markAsTagged(problem_id);

            res.status(200).json(searchsmithResponse.data);

        } catch (error) {
            console.error('[Sync Error]', error.message);
            // If it's an axios error with a response, log the response data
            if (error.response) {
                console.error('Error response from SearchSmith:', error.response.data);
                console.error('Error response status:', error.response.status);
            }
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;
