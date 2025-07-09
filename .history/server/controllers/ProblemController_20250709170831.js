const BaseController = require('./BaseController');

class ProblemController extends BaseController {
    constructor(problemRepository) {
        super();
        this.problemRepository = problemRepository;
    }

    /**
     * Get all problems.
     * Converted to an arrow function to bind 'this' correctly.
     */
    getAll = async (req, res) => {
        try {
            const problems = await this.problemRepository.getAll();
            this.ok(res, problems);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    /**
     * Get a single problem by its ID.
     * Converted to an arrow function to bind 'this' correctly.
     */
    getById = async (req, res) => {
        try {
            const { id } = req.params;
            const problem = await this.problemRepository.getById(id);

            if (!problem) {
                return this.notFound(res, 'Problem not found');
            }

            this.ok(res, problem);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = ProblemController;