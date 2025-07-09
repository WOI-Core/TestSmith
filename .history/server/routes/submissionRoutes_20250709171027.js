const BaseController = require('./BaseController');

class SubmissionController extends BaseController {
    constructor(submissionRepository, submissionService) {
        super();
        this.submissionRepository = submissionRepository;
        this.submissionService = submissionService;
    }

    /**
     * Handles the submission of a new solution.
     * Converted to an arrow function to bind 'this' correctly and removed asyncHandler.
     */
    submit = async (req, res) => {
        const { problemId, language_id, source_code, userId } = req.body;

        if (!problemId || !language_id || !source_code || !userId) {
            return this.badRequest(res, 'Missing required fields for submission.');
        }

        try {
            // The submission service will handle creating the submission
            // and sending it to the judge.
            const submission = await this.submissionService.submit({
                problemId,
                language_id,
                source_code,
                userId,
            });

            this.created(res, submission);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    /**
     * Gets all submissions for a specific user.
     * Converted to an arrow function.
     */
    getSubmissionsByUserId = async (req, res) => {
        try {
            const { userId } = req.params;
            const submissions = await this.submissionRepository.getByUserId(userId);
            this.ok(res, submissions);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    /**
     * Gets a single submission by its ID.
     * Converted to an arrow function.
     */
    getSubmissionById = async (req, res) => {
        try {
            const { submissionId } = req.params;
            const submission = await this.submissionRepository.getById(submissionId);

            if (!submission) {
                return this.notFound(res, 'Submission not found.');
            }

            this.ok(res, submission);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = SubmissionController;