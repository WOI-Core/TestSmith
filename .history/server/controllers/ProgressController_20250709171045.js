/**
 * Progress Controller
 * Handles user progress and leaderboard
 */
const BaseController = require("./BaseController")
const ProgressRepository = require("../repositories/ProgressRepository")

class ProgressController extends BaseController {
  constructor() {
    super("ProgressController")
  }

  /**
   * Save user progress
   */
  saveProgress = this.asyncHandler(async (req, res) => {
    const { userId, problemId } = req.body

    // Validate required fields
    if (!this.validateRequired(req, res, ["userId", "problemId"])) {
      return
    }

    try {
      await ProgressRepository.saveProgress(userId, problemId)
      this.sendSuccess(res, null, "Progress saved")
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get user progress
   */
  getUserProgress = this.asyncHandler(async (req, res) => {
    const { userId } = req.params

    try {
      const completed = await ProgressRepository.getUserProgress(userId)
      this.sendSuccess(res, { completed })
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Get leaderboard
   */
  getLeaderboard = this.asyncHandler(async (req, res) => {
    try {
      const leaderboard = await ProgressRepository.getLeaderboard()
      this.sendSuccess(res, { leaderboard })
    } catch (error) {
      this.sendError(res, error)
    }
  })
}

module.exports = new ProgressController()
