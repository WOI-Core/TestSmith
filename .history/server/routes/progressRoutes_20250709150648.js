/**
 * Progress Routes
 * Handles user progress and leaderboard
 */
const express = require("express")
const ProgressController = require("../controllers/ProgressController")

const router = express.Router()

// POST /api/progress - Save user progress
router.post("/", ProgressController.saveProgress)

// The specific route for the leaderboard now comes first
router.get('/leaderboard', ProgressController.getLeaderboard);

// The general route for a user's progress comes second
router.get('/:userId', ProgressController.getUserProgress);

module.exports = router
