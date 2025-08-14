const BaseController = require('./BaseController');

class SubmissionController extends BaseController {
    constructor(submissionRepository, submissionService) {
        super();
        this.submissionRepository = submissionRepository;
        this.submissionService = submissionService;
    }

    async submit(req, res) {
        try {
            const result = await this.submissionService.submit(req.body);
            res.status(201).json(result);
        } catch (error) {
            console.error('Error in SubmissionController.submit:', error);
            res.status(500).json({ message: 'An error occurred during submission.', error: error.message });
        }
    }

    async getSubmissionsByUserId(req, res) {
        try {
            const { userId } = req.params;
            const submissions = await this.submissionService.getSubmissionsByUserId(userId);
            res.status(200).json(submissions);
        } catch (error) {
            console.error('Error in SubmissionController.getSubmissionsByUserId:', error);
            res.status(500).json({ message: 'Failed to retrieve submissions.', error: error.message });
        }
    }

    async getSubmissionById(req, res) {
        try {
            const { submissionId } = req.params;
            const submission = await this.submissionService.getSubmissionById(submissionId);
            if (submission) {
                res.status(200).json(submission);
            } else {
                res.status(404).json({ message: 'Submission not found.' });
            }
        } catch (error) {
            console.error('Error in SubmissionController.getSubmissionById:', error);
            res.status(500).json({ message: 'Failed to retrieve submission.', error: error.message });
        }
    }

    handleJudge0Webhook = async (req, res) => {
        const { token, stdout, stderr, status, time, memory } = req.body;
        
        if (!token) {
            return this.badRequest(res, 'Missing token');
        }

        try {
            await this.submissionService.updateSubmissionFromWebhook(token, {
                stdout: stdout ? Buffer.from(stdout, 'base64').toString('utf-8') : null,
                stderr: stderr ? Buffer.from(stderr, 'base64').toString('utf-8') : null,
                status,
                time,
                memory,
            });
            this.ok(res, { message: 'Webhook received' });
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = SubmissionController;
