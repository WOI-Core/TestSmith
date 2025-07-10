class SubmissionController {
  /**
   * The constructor now accepts the injected service instances.
   * This aligns with how you create the controller in your routes file.
   * @param {object} submissionRepository - The repository for database interactions.
   * @param {object} submissionService - The service for business logic.
   */
  constructor(submissionRepository, submissionService) {
    // Ensure the service is assigned to this instance
    this.submissionRepository = submissionRepository;
    this.submissionService = submissionService;

    // It's good practice to check if the dependencies are provided
    if (!this.submissionService) {
      throw new Error("SubmissionController: submissionService is undefined.");
    }
  }

  /**
   * Handles the submission creation request.
   */
  async submit(req, res) {
    try {
      // The service is now correctly referenced via `this`
      const result = await this.submissionService.submit(req.body);
      // 201 Created is a more appropriate status code for a successful POST request.
      res.status(201).json(result);
    } catch (error) {
      console.error('Error in SubmissionController.submit:', error);
      res.status(500).json({ message: 'An error occurred during submission.', error: error.message });
    }
  }

  /**
   * Handles fetching submissions for a specific user.
   * This method was missing, which caused the crash.
   */
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

  /**
   * Handles fetching a single submission by its ID.
   * This method was also missing.
   */
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
}

module.exports = SubmissionController;
