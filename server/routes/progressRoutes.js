/**
 * Progress Routes
 * Handles user progress and leaderboard
 */
const express = require("express")
const ProgressController = require("../controllers/ProgressController")

const router = express.Router()

// POST /api/progress - Save user progress
router.post("/", ProgressController.saveProgress)

// GET /api/progress/:userId - Get user progress
router.get("/:userId", ProgressController.getUserProgress)

// GET /api/progress/leaderboard - Get leaderboard
router.get("/leaderboard", ProgressController.getLeaderboard)

module.exports = router
