/**
 * Submission Controller
 * Handles code submission and evaluation
 */
const BaseController = require("./BaseController")
const SubmissionRepository = require("../repositories/SubmissionRepository")
const SupabaseService = require("../services/SupabaseService")
const Judge0Service = require("../services/Judge0Service")
const ProgressRepository = require("../repositories/ProgressRepository")

class SubmissionController extends BaseController {
  constructor() {
    super("SubmissionController")
  }

  /**
   * Submit solution for evaluation
   */
  submitSolution = this.asyncHandler(async (req, res) => {
    const { problemId, language_id, source_code, userId } = req.body

    // Validate required fields
    if (!this.validateRequired(req, res, ["problemId", "language_id", "source_code"])) {
      return
    }

    try {
      // Map language ID to name
      const language = language_id === "71" ? "Python" : language_id === "54" ? "C++" : language_id

      // Create submission record
      const submissionResult = await SubmissionRepository.createSubmission({
        user_id: userId,
        problem_id: problemId,
        language: language,
        status: "Evaluating",
        source_code: source_code,
      })

      const submissionId = submissionResult.lastID

      // Get problem configuration and test cases
      const [config, testCases] = await Promise.all([
        SupabaseService.getProblemConfig(problemId),
        SupabaseService.getTestCases(problemId),
      ])

      // Submit to Judge0
      const results = await Judge0Service.evaluateSubmission({
        language_id,
        source_code,
        testCases,
        config,
      })

      // Determine final status
      const status = results.every((r) => r.status?.description === "Accepted") ? "Accepted" : "Rejected"

      // Update submission with results
      await SubmissionRepository.updateSubmissionResults(submissionId, status, results)

      // Save progress if accepted
      if (status === "Accepted" && userId && problemId) {
        await ProgressRepository.saveProgress(userId, problemId)
      }

      this.sendSuccess(res, { results })
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get user submissions
   */
  getUserSubmissions = this.asyncHandler(async (req, res) => {
    const { userId } = req.params

    try {
      const submissions = await SubmissionRepository.getByUserId(userId)
      this.sendSuccess(res, { submissions })
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get submission details
   */
  getSubmissionDetails = this.asyncHandler(async (req, res) => {
    const { submissionId } = req.params

    try {
      const submission = await SubmissionRepository.getSubmissionDetails(submissionId)
      if (!submission) {
        return this.sendError(res, new Error("Submission not found"), 404)
      }

      this.sendSuccess(res, submission)
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get submission results
   */
  getSubmissionResults = this.asyncHandler(async (req, res) => {
    const { submissionId } = req.params

    try {
      const results = await SubmissionRepository.getSubmissionResults(submissionId)
      this.sendSuccess(res, { results: results || [] })
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Check evaluation status
   */
  getEvaluationStatus = this.asyncHandler(async (req, res) => {
    const { userId, problemId } = req.params

    try {
      const evaluating = await SubmissionRepository.hasEvaluatingSubmission(userId, problemId)
      this.sendSuccess(res, { evaluating })
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get latest submission
   */
  getLatestSubmission = this.asyncHandler(async (req, res) => {
    const { userId, problemId } = req.params

    try {
      const submission = await SubmissionRepository.getLatestSubmission(userId, problemId)
      this.sendSuccess(res, submission || {})
    } catch (error) {
      this.sendError(res, error)
    }
  })
}

module.exports = new SubmissionController()