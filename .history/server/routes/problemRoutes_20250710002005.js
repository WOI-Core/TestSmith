const express = require('express');
const ProblemController = require('../controllers/ProblemController');
const router = express.Router();

// General GET route
router.get('/', ProblemController.getAllProblems);

// Specific routes should come before dynamic routes
router.get('/untagged', ProblemController.getUntaggedProblems);
router.post('/search', ProblemController.searchProblems);
router.post('/sync-searchsmith', ProblemController.syncWithSearchsmith);

// Route for creating a new problem
router.post('/', ProblemController.createProblem);

// Dynamic route for getting a single problem by ID should be last
router.get('/:id', ProblemController.getProblemById);

module.exports = router;
