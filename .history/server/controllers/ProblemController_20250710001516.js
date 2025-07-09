const ProblemRepository = require('../repositories/ProblemRepository');
const axios = require('axios');

class ProblemController {
    static async getAllProblems(req, res, next) {
        try {
            const problems = await ProblemRepository.findAll();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemById(req, res, next) {
        try {
            const { id } = req.params;
            const problem = await ProblemRepository.findById(id);
            res.status(200).json(problem);
        } catch (error) {
            next(error);
        }
    }
    
    // This method is a proxy and can remain as is if you fixed next.config.mjs
    static async searchProblems(req, res, next) {
        // This controller method might not be hit if the proxy is configured correctly,
        // but we leave it as a fallback. The logic should ideally live in the search service.
        res.status(404).json({ message: "Search endpoint should be proxied to SearchSmith service." });
    }

    // --- NEW FUNCTIONS START HERE ---

    /**
     * Handles request from the "Add New Problem" form.
     */
    static async createProblem(req, res, next) {
        try {
            const problemData = req.body;
            // You can add validation for the body here
            const newProblem = await ProblemRepository.create(problemData);
            res.status(201).json(newProblem);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles request to get the list of problems for the sync table.
     */
    static async getUntaggedProblems(req, res, next) {
        try {
            const problems = await ProblemRepository.findUntagged();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles the "Sync" button click.
     * 1. Calls SearchSmith to index the problem.
     * 2. Marks the problem as tagged in the main DB if successful.
     */
    static async syncWithSearchsmith(req, res, next) {
        try {
            const { problem_name, markdown_content, solution_code, problem_id } = req.body;

            // 1. Call SearchSmith service
            const searchsmithResponse = await axios.post('http://localhost:8000/v1/update-database', {
                problem_name,
                markdown_content,
                solution_code
            });
            
            if (searchsmithResponse.status !== 200) {
                throw new Error('SearchSmith service returned an error.');
            }

            // 2. If successful, mark as tagged in our database
            await ProblemRepository.markAsTagged(problem_id);

            // 3. Return the successful response from SearchSmith to the frontend
            res.status(200).json(searchsmithResponse.data);

        } catch (error) {
            console.error('[Sync Error]', error.message);
            // Forward a generic error to the frontend
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;
