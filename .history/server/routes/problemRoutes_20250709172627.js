const express = require("express");
const ProblemController = require("../controllers/ProblemController");

const router = express.Router();
const problemController = new ProblemController();

router.get("/list", problemController.getProblemList);
router.get("/:problemId/config", problemController.getProblemConfig);
router.get("/:problemId/testcases", problemController.getTestCases);

module.exports = router;