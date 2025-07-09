/**
 * Submission Routes
 * Handles code submission and evaluation
 */
const express = require("express")
const SubmissionController = require("../controllers/SubmissionController")

const router = express.Router()

// POST /api/submissions/submit - Submit solution
router.post("/submit", SubmissionController.submitSolution)

// GET /api/submissions/user/:userId - Get user submissions
router.get("/user/:userId", SubmissionController.getUserSubmissions)

// GET /api/submissions/:submissionId - Get submission details
router.get("/:submissionId", SubmissionController.getSubmissionDetails)

// GET /api/submissions/:submissionId/results - Get submission results
router.get("/:submissionId/results", SubmissionController.getSubmissionResults)

// GET /api/submissions/status/:userId/:problemId - Check evaluation status
router.get("/status/:userId/:problemId", SubmissionController.getEvaluationStatus)

// GET /api/submissions/latest/:userId/:problemId - Get latest submission
router.get("/latest/:userId/:problemId", SubmissionController.getLatestSubmission)

module.exports = router
