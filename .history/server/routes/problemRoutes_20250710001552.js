const express = require('express');
const ProblemController = require('../controllers/ProblemController');
const router = express.Router();

// --- EXISTING ROUTES ---
router.get('/', ProblemController.getAllProblems);
router.get('/:id', ProblemController.getProblemById);
router.post('/search', ProblemController.searchProblems);

// --- NEW ROUTES ---

// POST /api/problems - Creates a new problem
router.post('/', ProblemController.createProblem);

// GET /api/problems/untagged - Gets problems not yet synced
router.get('/untagged', ProblemController.getUntaggedProblems);

// POST /api/problems/sync-searchsmith - Triggers a sync for one problem
router.post('/sync-searchsmith', ProblemController.syncWithSearchsmith);


module.exports = router;
