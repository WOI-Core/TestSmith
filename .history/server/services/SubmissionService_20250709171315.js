// File to create: server/services/SubmissionService.js

class SubmissionService {
    constructor(submissionRepository) {
        this.submissionRepository = submissionRepository;
        // In a real application, you would inject a Judge0 or other judging service client here.
    }

    /**
     * Creates a submission record in the database and would normally
     * send it to an external judging service.
     */
    async submit(submissionData) {
        try {
            // 1. Create a submission record in your database with a "Pending" status.
            const newSubmission = await this.submissionRepository.create({
                problem_id: submissionData.problemId,
                language_id: submissionData.language_id,
                source_code: submissionData.source_code,
                user_id: submissionData.userId,
                status_id: 1, // Assuming 1 is the ID for "In Queue" or "Pending"
            });

            // 2. (Future Step) Send the submission to an external judge like Judge0.
            //    You would get a token back from the judge.
            // const judgeToken = await this.judgeService.submit(newSubmission);

            // 3. (Future Step) You might update your submission record with the judge's token.
            // await this.submissionRepository.update(newSubmission.id, { judge_token: judgeToken });

            // For now, we just return the submission record created in our database.
            return newSubmission;

        } catch (error) {
            console.error('[SubmissionService] Error during submission:', error);
            // Re-throw the error to be caught by the controller
            throw new Error('Failed to process submission.');
        }
    }
}

module.exports = SubmissionService;