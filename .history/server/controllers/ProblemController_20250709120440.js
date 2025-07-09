/**
 * Problem Controller
 * Handles problem-related operations
 */
const BaseController = require("./BaseController")
const GitHubService = require("../services/GitHubService")

class ProblemController extends BaseController {
  constructor() {
    super("ProblemController")
  }

  /**
   * Get problem list from GitHub
   */
  getProblemList = this.asyncHandler(async (req, res) => {
    try {
      const problems = await GitHubService.getProblemList()
      this.sendSuccess(res, problems)
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get problem configuration
   */
  getProblemConfig = this.asyncHandler(async (req, res) => {
    const { problemId } = req.params

    try {
      const config = await GitHubService.getProblemConfig(problemId)
      this.sendSuccess(res, config)
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get test cases for a problem
   */
  getTestCases = this.asyncHandler(async (req, res) => {
    const { problemId } = req.params

    try {
      const testCases = await GitHubService.getTestCases(problemId)
      this.sendSuccess(res, testCases)
    } catch (error) {
      this.sendError(res, error)
    }
  })
}

module.exports = new ProblemController()
