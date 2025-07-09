const BaseController = require('./BaseController');

class SubmissionController extends BaseController {
    constructor(submissionRepository, submissionService) {
        super();
        this.submissionRepository = submissionRepository;
        this.submissionService = submissionService;
    }

    submit = async (req, res) => {
        const { problemId, language, source_code, userId } = req.body;

        if (!problemId || !language || !source_code || !userId) {
            return this.badRequest(res, 'Missing required fields for submission.');
        }

        try {
            const submission = await this.submissionService.submit({
                problemId,
                language,
                source_code,
                userId,
            });
            this.created(res, submission);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    getSubmissionsByUserId = async (req, res) => {
        try {
            const { userId } = req.params;
            
            // Add a check to ensure userId is not undefined
            if (!userId) {
                return this.badRequest(res, 'User ID is missing from the request.');
            }

            const submissions = await this.submissionRepository.getByUserId(userId);
            this.ok(res, submissions);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    getSubmissionById = async (req, res) => {
        try {
            const { submissionId } = req.params;
            if (!submissionId) {
                return this.badRequest(res, 'Submission ID is missing.');
            }
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