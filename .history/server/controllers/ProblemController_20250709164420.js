const BaseController = require('./BaseController');

class ProblemController extends BaseController {
    constructor(problemRepository) {
        super();
        this.problemRepository = problemRepository;
    }

    getAll = async (req, res) => {
        try {
            const problems = await this.problemRepository.getAll();
            this.ok(res, problems);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

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