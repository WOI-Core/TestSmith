const BaseController = require('./BaseController');

class WebhookController extends BaseController {
    constructor(submissionService) {
        super();
        this.submissionService = submissionService;
    }

    handleJudge0Webhook = async (req, res) => {
        console.log('[Webhook] Judge0 webhook received:', JSON.stringify(req.body, null, 2));
        
        const { token, stdout, stderr, compile_output, status, time, memory, message } = req.body;
        
        if (!token) {
            return this.badRequest(res, 'Missing token');
        }

        try {
            // Decode base64 encoded fields
            const webhookData = {
                stdout: stdout ? Buffer.from(stdout, 'base64').toString('utf-8') : null,
                stderr: stderr ? Buffer.from(stderr, 'base64').toString('utf-8') : null,
                compile_output: compile_output ? Buffer.from(compile_output, 'base64').toString('utf-8') : null,
                status,
                time: parseFloat(time) || 0,
                memory: parseInt(memory) || 0,
                message: message ? Buffer.from(message, 'base64').toString('utf-8') : null,
            };

            console.log('[Webhook] Processing webhook for token:', token, 'status:', status?.description);
            
            await this.submissionService.updateSubmissionFromWebhook(token, webhookData);
            
            // Return 200 status to acknowledge webhook receipt
            this.ok(res, { message: 'Webhook received' });
        } catch (error) {
            console.error('[Webhook] Error processing Judge0 webhook:', error);
            this.internalServerError(res, error);
        }
    };
}

module.exports = WebhookController; 