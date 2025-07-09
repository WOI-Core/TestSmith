/**
 * Problem Routes
 * Handles problem listing and GitHub integration
 */
const express = require("express")
const ProblemController = require("../controllers/ProblemController")

const router = express.Router()

// GET /api/problems/list - Get problem list from GitHub
router.get("/list", ProblemController.getProblemList)

// GET /api/problems/:problemId/config - Get problem configuration
router.get("/:problemId/config", ProblemController.getProblemConfig)

// GET /api/problems/:problemId/testcases - Get test cases
router.get("/:problemId/testcases", ProblemController.getTestCases)

module.exports = router
